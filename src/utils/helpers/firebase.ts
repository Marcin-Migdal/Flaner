export const toSerializable = <T>(data: unknown): T => JSON.parse(JSON.stringify(data));
