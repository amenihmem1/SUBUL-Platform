"use client";

type ControlPanelProps = {
  cvUploaded: boolean;
  loadingCv: boolean;
  onSelectCv: (file: File | null) => void;
  onUploadCv: () => Promise<void>;
  selectedCvLabel: string;
  copy: {
    kicker: string;
    subtitle: string;
    dragResume: string;
    fileTypes: string;
    browseFiles: string;
    noFileSelected: string;
    uploadCv: string;
    uploading: string;
    cvUploaded: string;
    readyToUpload: string;
    waitingForCv: string;
  };
};

export function ControlPanel({
  cvUploaded,
  loadingCv,
  onSelectCv,
  onUploadCv,
  selectedCvLabel,
  copy,
}: ControlPanelProps) {
  const hasSelectedCv = selectedCvLabel !== copy.noFileSelected;

  return (
    <section className="control-panel">
      <div className="control-panel-glow" aria-hidden="true" />
      <div className="panel-copy">
        <div className="section-kicker">{copy.kicker}</div>
        <div className="section-subtitle">{copy.subtitle}</div>
      </div>
      <div className="form">
        <div className="resume-uploader">
          <label className={`resume-dropzone ${hasSelectedCv ? "has-file" : ""}`}>
            <span className="resume-dropzone-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 16V6" />
                <path d="M8.5 9.5 12 6l3.5 3.5" />
                <path d="M5 15v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
              </svg>
            </span>
            <span className="resume-dropzone-title">{copy.dragResume}</span>
            <span className="resume-dropzone-button">{copy.browseFiles}</span>
            <span className={`resume-selected ${hasSelectedCv ? "visible" : ""}`}>
              {hasSelectedCv ? selectedCvLabel : copy.noFileSelected}
            </span>
            <span className="file-picker">
              <input
                className="file-picker-input"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff"
                onChange={(event) => onSelectCv(event.target.files?.[0] || null)}
              />
            </span>
          </label>
          <div className="resume-actions">
            <button
              type="button"
              className="secondary primary-upload"
              disabled={loadingCv || !hasSelectedCv}
              onClick={onUploadCv}
            >
              <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 16V7" />
                <path d="M8.5 10.5 12 7l3.5 3.5" />
                <path d="M6 17v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" />
              </svg>
              {loadingCv ? copy.uploading : copy.uploadCv}
            </button>
            <span className={`pill resume-pill ${cvUploaded ? "on" : ""}`}>
              {cvUploaded ? copy.cvUploaded : hasSelectedCv ? copy.readyToUpload : copy.waitingForCv}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

