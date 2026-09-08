import { useEffect, useState } from "react";
import { checkSession } from "./api";
import Login from "./components/Login";
import Generator from "./components/Generator";
import AudioModule from "./components/AudioModule";
import ModuleMenu, { type ModuleKey } from "./components/ModuleMenu";

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey | null>(null);

  useEffect(() => {
    checkSession()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) return null;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  if (activeModule === "video") {
    return <Generator onBack={() => setActiveModule(null)} />;
  }
  if (activeModule === "audio") {
    return <AudioModule onBack={() => setActiveModule(null)} />;
  }

  return <ModuleMenu onSelect={setActiveModule} />;
}
