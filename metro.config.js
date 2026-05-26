const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Garantindo que o Metro encontre todos os arquivos necessários
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx', 'js', 'jsx', 'json'];

// Limita o número de workers para evitar erro de falta de memória (OOM/Zone Allocation failed) no Node 22/24
config.maxWorkers = 2;

module.exports = config;

