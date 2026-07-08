from __future__ import annotations

import base64
import hashlib
import hmac
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx

from core.paths import sanitize_storage_name


@dataclass(frozen=True, slots=True)
class AzureBlobUploadResult:
    container: str
    blob_name: str
    url: str


class AzureBlobStorage:
    API_VERSION = "2023-11-03"

    def __init__(
        self,
        *,
        connection_string: str = "",
        account_name: str = "",
        account_key: str = "",
        container: str = "cv-files",
    ) -> None:
        parsed = self._parse_connection_string(connection_string)
        self.account_name = account_name or parsed.get("AccountName", "")
        raw_connection_string = str(connection_string or "").strip()
        connection_string_as_key = raw_connection_string if raw_connection_string and "=" not in raw_connection_string.rstrip("=") else ""
        self.account_key = account_key or parsed.get("AccountKey", "") or connection_string_as_key
        endpoint_suffix = parsed.get("EndpointSuffix", "core.windows.net")
        default_endpoint = f"https://{self.account_name}.blob.{endpoint_suffix}" if self.account_name else ""
        self.endpoint = parsed.get("BlobEndpoint", default_endpoint).rstrip("/")
        self.container = sanitize_storage_name(container or "cv-files", fallback="cv-files").lower()

        if not self.account_name or not self.account_key or not self.endpoint:
            raise ValueError(
                "Configuration Azure Storage incomplete. Utilisez une connection string complete "
                "ou AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY."
            )

    @staticmethod
    def _parse_connection_string(raw: str) -> dict[str, str]:
        parts: dict[str, str] = {}
        for item in str(raw or "").strip().split(";"):
            if not item or "=" not in item:
                continue
            key, value = item.split("=", 1)
            parts[key.strip()] = value.strip()
        return parts

    def upload_cv(self, *, session_id: str, filename: str, raw_bytes: bytes, content_type: str = "application/octet-stream") -> AzureBlobUploadResult:
        self.ensure_container()
        blob_name = self._build_cv_blob_name(session_id, filename)
        self._put_blob(blob_name=blob_name, raw_bytes=raw_bytes, content_type=content_type)
        return AzureBlobUploadResult(
            container=self.container,
            blob_name=blob_name,
            url=f"{self.endpoint}/{self.container}/{self._quote_blob_path(blob_name)}",
        )

    def upload_bytes(self, *, blob_name: str, raw_bytes: bytes, content_type: str = "application/octet-stream") -> AzureBlobUploadResult:
        self.ensure_container()
        safe_blob_name = self._sanitize_blob_name(blob_name)
        self._put_blob(blob_name=safe_blob_name, raw_bytes=raw_bytes, content_type=content_type)
        return AzureBlobUploadResult(
            container=self.container,
            blob_name=safe_blob_name,
            url=f"{self.endpoint}/{self.container}/{self._quote_blob_path(safe_blob_name)}",
        )

    def ensure_container(self) -> None:
        url = f"{self.endpoint}/{self.container}"
        response = self._request("PUT", url, params={"restype": "container"})
        if response.status_code not in {201, 202, 409}:
            response.raise_for_status()

    def healthcheck(self) -> dict[str, Any]:
        try:
            self.ensure_container()
            return {
                "ok": True,
                "account_name": self.account_name,
                "container": self.container,
                "endpoint": self.endpoint,
            }
        except Exception as exc:
            return {
                "ok": False,
                "account_name": self.account_name,
                "container": self.container,
                "endpoint": self.endpoint,
                "error": str(exc),
            }

    def _put_blob(self, *, blob_name: str, raw_bytes: bytes, content_type: str) -> None:
        url = f"{self.endpoint}/{self.container}/{self._quote_blob_path(blob_name)}"
        response = self._request(
            "PUT",
            url,
            raw_bytes=raw_bytes,
            content_type=content_type,
            extra_headers={"x-ms-blob-type": "BlockBlob"},
        )
        response.raise_for_status()

    def _request(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, str] | None = None,
        raw_bytes: bytes = b"",
        content_type: str = "",
        extra_headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        headers = {
            "x-ms-date": datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "x-ms-version": self.API_VERSION,
            **(extra_headers or {}),
        }
        if content_type:
            headers["Content-Type"] = content_type
        if raw_bytes:
            headers["Content-Length"] = str(len(raw_bytes))
        headers["Authorization"] = self._authorization_header(
            method=method,
            content_length=len(raw_bytes),
            content_type=content_type,
            headers=headers,
            container=self.container,
            blob_name=self._blob_name_from_url(url),
            params=params or {},
        )
        return httpx.request(method, url, params=params, headers=headers, content=raw_bytes, timeout=30.0)

    def _authorization_header(
        self,
        *,
        method: str,
        content_length: int,
        content_type: str,
        headers: dict[str, str],
        container: str,
        blob_name: str,
        params: dict[str, str],
    ) -> str:
        canonicalized_headers = "".join(
            f"{key.lower()}:{str(headers[key]).strip()}\n"
            for key in sorted(headers)
            if key.lower().startswith("x-ms-")
        )
        canonicalized_resource = f"/{self.account_name}/{container}"
        if blob_name:
            canonicalized_resource += f"/{blob_name}"
        for key in sorted(params):
            canonicalized_resource += f"\n{key.lower()}:{params[key]}"

        string_to_sign = "\n".join(
            [
                method.upper(),
                "",
                "",
                str(content_length) if content_length else "",
                "",
                content_type,
                "",
                "",
                "",
                "",
                "",
                "",
                canonicalized_headers + canonicalized_resource,
            ]
        )
        signature = base64.b64encode(
            hmac.new(
                base64.b64decode(self.account_key),
                string_to_sign.encode("utf-8"),
                hashlib.sha256,
            ).digest()
        ).decode("ascii")
        return f"SharedKey {self.account_name}:{signature}"

    def _blob_name_from_url(self, url: str) -> str:
        prefix = f"{self.endpoint}/{self.container}/"
        if not url.startswith(prefix):
            return ""
        return url[len(prefix) :]

    @staticmethod
    def _quote_blob_path(blob_name: str) -> str:
        return "/".join(quote(part, safe="") for part in blob_name.split("/"))

    @staticmethod
    def _sanitize_blob_name(blob_name: str) -> str:
        parts = [
            re.sub(r"[^A-Za-z0-9_.-]+", "_", part).strip("._") or "file"
            for part in str(blob_name or "").split("/")
            if part.strip()
        ]
        return "/".join(parts) or "file"

    @staticmethod
    def _build_cv_blob_name(session_id: str, filename: str) -> str:
        safe_session = sanitize_storage_name(session_id, fallback="session")
        safe_filename = re.sub(r"[^A-Za-z0-9_.-]+", "_", filename).strip("._") or "cv"
        return f"cv/{safe_session}/{safe_filename}"
