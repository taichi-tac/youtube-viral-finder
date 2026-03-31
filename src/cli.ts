#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync } from 'fs';
import { exec } from 'child_process';
import { YouTubeClient } from './youtube-client.js';
import { ResultFormatter } from './formatter.js';
import type { SearchOptions } from './types.js';

// 環境変数を読み込み
dotenv.config();

const program = new Command();

program
  .name('youtube-viral')
  .description('バイラル動画発見ツール - チャンネル登録者数の3倍以上の再生数を持つ動画を検索')
  .version('1.0.0');

program
  .command('search')
  .description('キーワードでバイラル動画を検索')
  .requiredOption('-k, --keyword <keyword>', '検索キーワード')
  .option('-a, --after <date>', '公開日の開始日 (YYYY-MM-DD形式)')
  .option('-b, --before <date>', '公開日の終了日 (YYYY-MM-DD形式)')
  .option('-m, --max <number>', '最大検索数', '50')
  .option('-t, --threshold <number>', '登録者倍率の閾値 (デフォルト: 3)', '3')
  .option('-o, --output <format>', '出力形式 (table|detailed|csv|json|html)', 'table')
  .option('-f, --file <path>', '結果をファイルに保存')
  .option('--open', 'HTML出力時に自動でブラウザを開く')
  .action(async (options) => {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      console.error(chalk.red('\n❌ エラー: YOUTUBE_API_KEY が設定されていません。'));
      console.log(chalk.yellow('\n.env ファイルに以下を設定してください:'));
      console.log(chalk.cyan('YOUTUBE_API_KEY=your_api_key_here\n'));
      console.log(chalk.gray('API キーの取得: https://console.cloud.google.com/apis/credentials\n'));
      process.exit(1);
    }

    try {
      const searchOptions: SearchOptions = {
        keyword: options.keyword,
        publishedAfter: options.after ? new Date(options.after).toISOString() : undefined,
        publishedBefore: options.before ? new Date(options.before).toISOString() : undefined,
        maxResults: parseInt(options.max),
        viralThreshold: parseFloat(options.threshold),
      };

      const spinner = ora('バイラル動画を検索中...').start();

      const client = new YouTubeClient(apiKey);
      const videos = await client.findViralVideos(searchOptions);

      spinner.stop();

      // 結果を表示
      switch (options.output) {
        case 'detailed':
          ResultFormatter.displayDetailed(videos);
          break;
        case 'csv':
          const csv = ResultFormatter.toCSV(videos);
          if (options.file) {
            writeFileSync(options.file, csv);
            console.log(chalk.green(`\n✅ CSVファイルを保存しました: ${options.file}\n`));
          } else {
            console.log(csv);
          }
          break;
        case 'json':
          const json = ResultFormatter.toJSON(videos);
          if (options.file) {
            writeFileSync(options.file, json);
            console.log(chalk.green(`\n✅ JSONファイルを保存しました: ${options.file}\n`));
          } else {
            console.log(json);
          }
          break;
        case 'html':
          const html = ResultFormatter.toHTML(videos, options.keyword);
          const htmlFile = options.file || 'youtube-viral-results.html';
          writeFileSync(htmlFile, html);
          console.log(chalk.green(`\n✅ HTMLファイルを保存しました: ${htmlFile}`));

          // ブラウザで開く
          if (options.open) {
            console.log(chalk.cyan('🌐 ブラウザを起動しています...\n'));
            const command = process.platform === 'darwin' ? 'open' :
                           process.platform === 'win32' ? 'start' : 'xdg-open';
            exec(`${command} ${htmlFile}`, (error) => {
              if (error) {
                console.error(chalk.yellow(`⚠️  ブラウザの自動起動に失敗しました: ${error.message}`));
                console.log(chalk.gray(`手動で ${htmlFile} を開いてください。\n`));
              }
            });
          } else {
            console.log(chalk.gray(`ブラウザで開くには: open ${htmlFile}\n`));
          }
          break;
        case 'table':
        default:
          ResultFormatter.displayTable(videos);
          if (options.file) {
            const csv = ResultFormatter.toCSV(videos);
            writeFileSync(options.file, csv);
            console.log(chalk.green(`✅ CSVファイルも保存しました: ${options.file}\n`));
          }
          break;
      }

      // 統計情報
      if (videos.length > 0 && options.output !== 'csv' && options.output !== 'json' && options.output !== 'html') {
        const avgRatio = videos.reduce((sum, v) => sum + v.viewsToSubscribersRatio, 0) / videos.length;
        const maxRatio = Math.max(...videos.map(v => v.viewsToSubscribersRatio));
        const avgLikeRate = videos.reduce((sum, v) => sum + v.likeRate, 0) / videos.length;

        console.log(chalk.bold('📊 統計情報:'));
        console.log(`  平均倍率:      ${avgRatio.toFixed(2)}x`);
        console.log(`  最大倍率:      ${maxRatio.toFixed(2)}x`);
        console.log(`  平均高評価率:  ${(avgLikeRate * 100).toFixed(2)}%`);
        console.log('');
      }

    } catch (error) {
      console.error(chalk.red('\n❌ エラーが発生しました:'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));

        // APIエラーの詳細表示
        if ('errors' in error) {
          console.error(chalk.gray('\n詳細:'), error);
        }
      }
      console.log('');
      process.exit(1);
    }
  });

// 使用例を表示
program
  .command('examples')
  .description('使用例を表示')
  .action(() => {
    console.log(chalk.bold('\n📚 使用例:\n'));

    console.log(chalk.cyan('1. 基本的な検索:'));
    console.log('   youtube-viral search -k "料理レシピ"\n');

    console.log(chalk.cyan('2. 期間を指定して検索:'));
    console.log('   youtube-viral search -k "プログラミング" -a 2024-01-01 -b 2024-12-31\n');

    console.log(chalk.cyan('3. 倍率を5倍に設定:'));
    console.log('   youtube-viral search -k "ゲーム実況" -t 5\n');

    console.log(chalk.cyan('4. 詳細表示:'));
    console.log('   youtube-viral search -k "筋トレ" -o detailed\n');

    console.log(chalk.cyan('5. CSV形式でファイルに保存:'));
    console.log('   youtube-viral search -k "DIY" -o csv -f results.csv\n');

    console.log(chalk.cyan('6. JSON形式でファイルに保存:'));
    console.log('   youtube-viral search -k "ビジネス" -o json -f results.json\n');

    console.log(chalk.cyan('7. HTML形式で保存してブラウザで開く:'));
    console.log('   youtube-viral search -k "料理" -o html --open\n');

    console.log(chalk.cyan('8. HTML形式でカスタムファイル名:'));
    console.log('   youtube-viral search -k "旅行" -o html -f my-results.html --open\n');
  });

program.parse();
