import { useEffect, useState } from "react";
import { checkSession } from "./api";
import Login from "./components/Login";
import Generator from "./components/Generator";

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    checkSession()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) return null;
  return authed ? <Generator /> : <Login onSuccess={() => setAuthed(true)} />;
}
