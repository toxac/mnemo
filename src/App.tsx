import { createSignal, onMount } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core"; // Required for calling Rust

function App() {
  const [vaultPath, setVaultPath] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      // Ask Rust for the default location and ensure it exists
      const defaultPath = await invoke<string>("get_default_vault");
      setVaultPath(defaultPath);
    } catch (err) {
      console.error("Failed to initialize default vault:", err);
    }
  });

  const selectVault = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select your Mnemo Vault"
    });
    if (selected) setVaultPath(selected as string);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Mnemo Vault</h1>
      {vaultPath() ? (
        <div>
          <p>Active Vault: <code>{vaultPath()}</code></p>
          <button onClick={selectVault}>Change Folder</button>
        </div>
      ) : (
        <p>Initializing...</p>
      )}
    </div>
  );
}

export default App;