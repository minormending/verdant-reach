// The build-time source statistics served by vite.config.ts (devdocsSource).
declare module "virtual:devdocs-source" {
  const stats: import("./charts/sourceStats").SourceStats;
  export default stats;
}
