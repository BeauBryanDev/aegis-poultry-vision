import { RouterProvider } from "react-router-dom";
import { router } from "./routes";

/** Root application component. Hosts the router (and future global providers). */
export default function App() {
  return <RouterProvider router={router} />;
}
