/** Vom Vite-Plugin beim Build kompiliert: JSON-String für `new Story(json)`. */
declare module "*.ink" {
  const json: string;
  export default json;
}
