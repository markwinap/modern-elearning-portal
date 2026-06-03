// Allow CSS side-effect imports (e.g. third-party component stylesheets)
declare module "*.css" {
  const styles: Record<string, string>;
  export default styles;
}
