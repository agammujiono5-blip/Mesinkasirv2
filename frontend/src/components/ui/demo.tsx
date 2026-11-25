import { useState } from "react";
import { SignIn2 } from "@/components/ui/clean-minimal-sign-in";

/**
 * Contoh pemakaian `SignIn2`. State disimpan di sini karena komponen
 * kartu login dibuat presentational (controlled).
 */
const Demo = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SignIn2
      username={username}
      onUsernameChange={setUsername}
      password={password}
      onPasswordChange={setPassword}
      onSubmit={() => alert("Sign in successful! (Demo)")}
    />
  );
};

export { Demo };
