export class PublicationError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 413,
    message: string,
  ) {
    super(message);
    this.name = "PublicationError";
  }
}
