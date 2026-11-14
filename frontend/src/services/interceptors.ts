/** Axios instance with base URL + shared request/response interceptors. */

import axios from "axios";
import { API_URL } from "@/utils/constants";

export const http = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
});

// Attach auth token if present (wired up once auth exists).
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("pv_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap { data } envelopes and surface a normalized error message.
http.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error?.response?.data?.error ?? error?.message ?? "Request failed";
    return Promise.reject(new Error(message));
  },
);
