import { engine } from "../uav-app/runtime.js";

export default function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Método não permitido." });
  }
  try {
    return response.status(200).json(engine.design(request.body ?? {}));
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
}
