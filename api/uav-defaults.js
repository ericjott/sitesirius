import { DEFAULTS } from "../uav-app/runtime.js";

export default function handler(_request, response) {
  response.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
  response.status(200).json(DEFAULTS);
}
