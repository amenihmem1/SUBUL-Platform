"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { type ScheduledInterview } from "../../../lib/interviewCalendar";
import styles from "../cancel-page.module.css";

type CancelInterviewPageProps = {
  params: Promise<{ token: string }>;
};

function formatInterviewDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export default function CancelInterviewPage({ params }: CancelInterviewPageProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [interview, setInterview] = useState<ScheduledInterview | null>(null);

  useEffect(() => {
    let active = true;

    const resolveAndLoad = async () => {
      try {
        const resolved = await params;
        if (!active) return;
        setToken(resolved.token || "");
        const response = await fetch(`/api/rh/interviews/cancel/${encodeURIComponent(resolved.token || "")}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(String(payload?.detail || payload?.error || "Impossible de retrouver cet entretien."));
        }
        if (!active) return;
        setInterview((payload?.interview as ScheduledInterview) || null);
      } catch (error) {
        if (!active) return;
        setErrorMessage((error as Error).message || "Impossible de retrouver cet entretien.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void resolveAndLoad();
    return () => {
      active = false;
    };
  }, [params]);

  const statusMessage = useMemo(() => {
    if (!interview) return "";
    if (interview.status === "cancelled") {
      return "Cet entretien a deja ete annule.";
    }
    if (interview.status !== "planned") {
      return "Cet entretien ne peut plus etre annule depuis cette page.";
    }
    return "";
  }, [interview]);

  const handleCancel = async () => {
    if (!token || !interview || interview.status !== "planned") return;

    setBusy(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch(`/api/rh/interviews/cancel/${encodeURIComponent(token)}`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.detail || payload?.error || "Impossible d'annuler cet entretien."));
      }
      setInterview((payload?.interview as ScheduledInterview) || interview);
      setSuccessMessage("La planification a bien ete annulee.");
    } catch (error) {
      setErrorMessage((error as Error).message || "Impossible d'annuler cet entretien.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Annulation entretien</p>
          <h1 className={styles.title}>Gerer votre planification</h1>
          <p className={styles.subtitle}>
            Consultez les details de votre entretien et annulez ce rendez-vous si vous n&apos;etes plus disponible.
          </p>
        </div>

        {loading ? <div className={styles.message}>Chargement de votre planification...</div> : null}
        {!loading && errorMessage ? <div className={`${styles.message} ${styles.messageError}`}>{errorMessage}</div> : null}

        {!loading && interview ? (
          <>
            <div className={styles.details}>
              <div className={styles.detailRow}>
                <span>Candidat</span>
                <strong>{interview.candidateName}</strong>
              </div>
              <div className={styles.detailRow}>
                <span>Date</span>
                <strong>{formatInterviewDate(interview.scheduledAt)}</strong>
              </div>
              <div className={styles.detailRow}>
                <span>Email</span>
                <strong>{interview.candidateEmail}</strong>
              </div>
            </div>

            {statusMessage ? <div className={styles.message}>{statusMessage}</div> : null}
            {successMessage ? <div className={`${styles.message} ${styles.messageSuccess}`}>{successMessage}</div> : null}
            {errorMessage && !loading ? <div className={`${styles.message} ${styles.messageError}`}>{errorMessage}</div> : null}

            <div className={styles.actions}>
              <button type="button" className={styles.primaryButton} onClick={handleCancel} disabled={busy || interview.status !== "planned"}>
                {busy ? "Annulation..." : "Annuler cet entretien"}
              </button>
              <Link className={styles.ghostButton} href="/">
                Retour
              </Link>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
