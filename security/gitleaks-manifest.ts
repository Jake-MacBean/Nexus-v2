export const gitleaksVersion = '8.30.1' as const;
export const gitleaksReleaseBaseUrl =
  `https://github.com/gitleaks/gitleaks/releases/download/v${gitleaksVersion}` as const;
export const gitleaksChecksums = Object.freeze({
  filename: `gitleaks_${gitleaksVersion}_checksums.txt`,
  sha256: '061476c21adaf5441516f96f185c1a4706a83cd6329b9b38762271b3d4a52fae',
});

export interface GitleaksAsset {
  readonly archive: string;
  readonly archiveSha256: string;
  readonly binary: string;
  readonly binarySha256: string;
}

export const gitleaksAssets: Readonly<Record<string, GitleaksAsset>> = Object.freeze({
  'linux-arm64': {
    archive: `gitleaks_${gitleaksVersion}_linux_arm64.tar.gz`,
    archiveSha256: 'e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080',
    binary: 'gitleaks',
    binarySha256: '00e91bbe655bd7c47753e8cfe61cb76ea1a5d7e7702fe161ee40102b46b3823b',
  },
  'linux-x64': {
    archive: `gitleaks_${gitleaksVersion}_linux_x64.tar.gz`,
    archiveSha256: '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb',
    binary: 'gitleaks',
    binarySha256: '88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509',
  },
  'win32-x64': {
    archive: `gitleaks_${gitleaksVersion}_windows_x64.zip`,
    archiveSha256: 'd29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e',
    binary: 'gitleaks.exe',
    binarySha256: '17157e2ee8b76fc8b1d8bee607a250e34b8a8023c8bc81822d4b5ee4d78fcb7c',
  },
});
