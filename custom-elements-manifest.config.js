function stripPrivateMembers() {
  return {
    name: 'strip-private-members',
    packageLinkPhase({ customElementsManifest }) {
      for (const mod of customElementsManifest.modules || []) {
        for (const decl of mod.declarations || []) {
          if (decl.members) {
            decl.members = decl.members.filter(
              (m) => !m.name.startsWith('_') && !m.name.startsWith('#')
            );
          }
        }
      }
    },
  };
}

export default {
  globs: ['src/**/*.js'],
  exclude: ['src/**/*.test.js'],
  outdir: '.',
  litelement: false,
  plugins: [stripPrivateMembers()],
};
