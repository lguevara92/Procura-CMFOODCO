import { SEMAFORO_CLASSES, SEMAFORO_LABELS, type ChecklistSemaforo } from "@/lib/checklist";

export function SemaforoBadge({ semaforo }: { semaforo: ChecklistSemaforo }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SEMAFORO_CLASSES[semaforo]}`}>
      {SEMAFORO_LABELS[semaforo]}
    </span>
  );
}
