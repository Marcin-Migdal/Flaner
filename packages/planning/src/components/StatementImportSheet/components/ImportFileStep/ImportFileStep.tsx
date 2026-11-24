import { cn } from "@flaner/shared/utils";
import { FileUp, LoaderCircle } from "lucide-react";
import { useId, useState, type DragEvent } from "react";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { STATEMENT_BANKS, decodeStatementFile, readStatement } from "../../../../utils/statementImport";
import type { ImportFile } from "../../types";
import { importFileStepStyles as styles } from "./ImportFileStep.styles";

export type ImportFileStepProps = {
  onRead: (file: ImportFile) => void;
};

const CSV_NAME = /\.csv$/i;

/** Import wizard, File step: drop or choose one CSV statement file. */
export const ImportFileStep = ({ onRead }: ImportFileStepProps) => {
  const { t } = usePlanningTranslations();
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const read = async (file: File) => {
    setError(null);
    if (!CSV_NAME.test(file.name)) {
      setError(t("budget.import.file.notCsv"));
      return;
    }

    setIsReading(true);
    try {
      const { bank, records } = await readStatement(decodeStatementFile(new Uint8Array(await file.arrayBuffer())));
      if (records.length < 2) setError(t("budget.import.file.empty"));
      else onRead({ name: file.name, bank, records });
    } catch {
      setError(t("budget.import.file.unreadable"));
    } finally {
      setIsReading(false);
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void read(file);
  };

  return (
    <div className={styles.root}>
      <label
        htmlFor={inputId}
        className={cn(styles.dropzone, isDragging && styles.dragging)}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        {isReading ? (
          <LoaderCircle aria-hidden="true" className={styles.spinner} />
        ) : (
          <FileUp aria-hidden="true" className={styles.icon} />
        )}
        <span className={styles.title}>{t("budget.import.file.drop")}</span>
        <span className={styles.hint}>{t("budget.import.file.hint")}</span>
        <input
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          className={styles.input}
          disabled={isReading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Choosing the same file again must still fire `change`
            event.target.value = "";
            if (file) void read(file);
          }}
        />
      </label>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <p className={styles.banks}>
        {t("budget.import.file.recognized", {
          banks: STATEMENT_BANKS.map((bank) => t(`budget.import.banks.${bank}`)).join(", "),
        })}
      </p>
    </div>
  );
};
