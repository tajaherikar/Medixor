// Export a default tenant for static build
export function generateStaticParams() {
  return [{ tenant: 'app' }];
}
