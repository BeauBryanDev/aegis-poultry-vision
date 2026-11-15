/** Axios instance with base URL + shared request/response interceptors. */

import axios from "axios";
import { API_URL } from "@/utils/constants";

export const http = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
});

// Surface a normalized error message. FastAPI puts it in `detail`.
http.interceptors.response.use(
  (res) => res,
  (error) => {
    const detail = error?.response?.data?.detail;
    const message =
      (typeof detail === "string" ? detail : null) ??
      (error?.response ? `Request failed (${error.response.status})` : null) ??
      (error?.code === "ERR_NETWORK" ? "Backend is not reachable." : null) ??
      error?.message ??
      "Request failed";
    return Promise.reject(new Error(message));
  },
);
