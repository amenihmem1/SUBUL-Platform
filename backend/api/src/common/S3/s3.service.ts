import { Injectable, Logger } from '@nestjs/common';
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';

@Injectable()
export class BlobStorageService {
  private readonly logger = new Logger(BlobStorageService.name);

  private containerClient: ReturnType<BlobServiceClient['getContainerClient']> | null = null;
  private accountName: string | null = null;
  private accountKey: string | null = null;
  private containerName: string | null = null;

  constructor() {
    // Use dedicated proof storage if set, otherwise fall back to tutor storage
    const accountName =
      process.env.PROOF_STORAGE_ACCOUNT_NAME ||
      process.env.TUTOR_AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey =
      process.env.PROOF_STORAGE_ACCOUNT_KEY ||
      process.env.TUTOR_AZURE_STORAGE_ACCOUNT_KEY;
    const containerName =
      process.env.PROOF_BLOB_CONTAINER ||
      'manual-proofs'; // separate container by default

    if (accountName && accountKey) {
      this.accountName = accountName;
      this.accountKey = accountKey;
      this.containerName = containerName;

      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      const blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential,
      );
      this.containerClient = blobServiceClient.getContainerClient(containerName);
      this.logger.log(
        `[BlobStorage] Initialized: account=${accountName} container=${containerName}`,
      );
    } else {
      this.logger.warn(
        '[BlobStorage] Missing env vars (TUTOR_AZURE_STORAGE_ACCOUNT_NAME / ' +
        'TUTOR_AZURE_STORAGE_ACCOUNT_KEY or PROOF_*). Falling back to local disk.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.containerClient !== null;
  }

  /** Upload a buffer. Returns the blob name (key). */
  async upload(blobName: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.containerClient) throw new Error('Blob storage is not configured');

    // Ensure container exists
    await this.containerClient.createIfNotExists({ access: 'blob' });

    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    this.logger.log(`[BlobStorage] Uploaded: ${blobName}`);
    return blobName;
  }

  /** Generate a SAS URL for reading. Expires in 1 hour. */
  async getDownloadUrl(blobName: string): Promise<string> {
    if (!this.containerClient || !this.accountName || !this.accountKey) {
      throw new Error('Blob storage is not configured');
    }

    const credential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
    const startsOn = new Date();
    const expiresOn = new Date(Date.now() + 3600 * 1000); // 1 hour

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName!,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        startsOn,
        expiresOn,
      },
      credential,
    ).toString();

    return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}?${sasToken}`;
  }

  /** Delete a blob */
  async delete(blobName: string): Promise<void> {
    if (!this.containerClient) throw new Error('Blob storage is not configured');
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
    this.logger.log(`[BlobStorage] Deleted: ${blobName}`);
  }
}
