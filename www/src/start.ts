import { createStart } from "@tanstack/react-start";
import { nativeAppCors } from "./server/native-app-cors";

export const startInstance = createStart(() => ({
  requestMiddleware: [nativeAppCors],
}));
