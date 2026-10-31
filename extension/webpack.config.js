const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { generateIcons } = require('./generate-icons');

// Pre-generate icon assets
generateIcons(path.resolve(__dirname, 'assets/icons'));

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'cheap-module-source-map',
    entry: {
      'service-worker': path.resolve(__dirname, 'src/background/service-worker.ts'),
      'content-script': path.resolve(__dirname, 'src/content/content-script.ts'),
      'popup': path.resolve(__dirname, 'src/popup/popup.ts'),
      'sidepanel': path.resolve(__dirname, 'src/sidepanel/sidepanel.ts'),
      'options': path.resolve(__dirname, 'src/options/options.ts'),
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: false,
              },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
              },
            },
            'postcss-loader',
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]',
          },
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src/popup/popup.html'),
        filename: 'popup.html',
        chunks: ['popup'],
        cache: false,
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src/sidepanel/sidepanel.html'),
        filename: 'sidepanel.html',
        chunks: ['sidepanel'],
        cache: false,
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src/options/options.html'),
        filename: 'options.html',
        chunks: ['options'],
        cache: false,
      }),
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'manifest.json'),
            to: path.resolve(__dirname, 'dist/manifest.json'),
          },
          {
            from: path.resolve(__dirname, 'assets'),
            to: path.resolve(__dirname, 'dist/assets'),
            noErrorOnMissing: true,
          },
        ],
      }),
    ],
  };
};
