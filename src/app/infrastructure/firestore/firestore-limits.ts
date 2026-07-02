// Límites operativos de Firestore compartidos por los adaptadores que escriben en lote.

/** Firestore admite hasta 500 operaciones por `writeBatch`; se usa 450 para dejar margen. */
export const MAX_BATCH_SIZE = 450;
