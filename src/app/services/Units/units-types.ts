export type Unit = {
  id: string;
  name: string;
  shortName: string;
};

export type FirestoreUnit = Omit<Unit, "id">;
