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
    <div class="flex h-screen w-full bg-brand-bg text-zinc-100 font-sans">
      
      {/* Sidebar: Categories */}
      <aside class="w-64 bg-brand-sidebar border-r border-brand-border flex flex-col">
        <div class="p-4 border-b border-brand-border">
          <h1 class="font-bold text-lg tracking-tight">MNEMO</h1>
        </div>
        <nav class="flex-1 overflow-y-auto p-2">
           {/* We will map categories here */}
           <div class="px-3 py-2 text-sm text-zinc-400">Categories</div>
        </nav>
        <div class="p-4 border-t border-brand-border">
           <button class="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs transition-colors">
             + New Category
           </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main class="flex-1 flex flex-col">
        <header class="h-14 border-b border-brand-border flex items-center px-6">
          <span class="text-sm font-mono text-zinc-500">{vaultPath()}</span>
        </header>
        
        <div class="flex-1 p-8">
          <h2 class="text-2xl font-semibold mb-4 text-zinc-100">Welcome to your Vault</h2>
          <p class="text-zinc-400">Select a category to start curating.</p>
        </div>
      </main>

    </div>
  );
}

export default App;