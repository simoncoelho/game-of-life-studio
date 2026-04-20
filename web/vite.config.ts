import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

function getBasePath() {
  const explicitBasePath = process.env.VITE_BASE_PATH

  if (explicitBasePath) {
    return explicitBasePath
  }

  const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1]

  return repositoryName ? `/${repositoryName}/` : "/"
}

// https://vite.dev/config/
export default defineConfig({
  base: getBasePath(),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
