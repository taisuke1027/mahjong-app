# App Store提出に向けたCapacitorネイティブ化 手順書

このドキュメントは、現在の単一HTMLファイルのPWA（麻雀成績管理）を、
App Store に提出できる形（Xcodeでビルドした `.ipa`）にするための手順です。

⚠️ **この作業はご自身のMac（Xcodeがインストールされた環境）で行う必要があります。**
このチャット環境はネットワークアクセスができないサンドボックスのため、npm/Capacitor/Xcodeのコマンドを
実際に実行・検証することができません。以下は Capacitor 公式ドキュメントに基づく手順ですが、
実行時にバージョン差異等で多少コマンドが変わる可能性があります。

---

## 事前に必要なもの

- macOS + Xcode（最新版、App Store経由でインストール）
- Node.js（18以上推奨）
- Apple Developer Program登録（年額$99）
- Apple IDでのXcodeサインイン

---

## 手順

### 1. プロジェクトの用意

現在お渡ししているZIP（`mahjong-app-deploy.zip`）を展開したフォルダを、作業用フォルダとして使います。

```bash
cd mahjong-app-deploy
npm init -y
```

### 2. Capacitorのインストール

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "麻雀成績管理" "com.yourcompany.mahjongscore" --web-dir .
```

- `com.yourcompany.mahjongscore` の部分は、Apple Developer側で登録する **Bundle ID** と一致させる必要があります（後で変更不可なので慎重に）。
- `--web-dir .` は、現在の `index.html` があるフォルダをそのままWebコンテンツとして使う指定です。

同梱の `capacitor.config.json`（このドキュメントと同じフォルダに用意しています）をベースに、
`appId` と `appName` をご自身のものに書き換えてご利用ください。

### 3. iOSプラットフォームの追加

```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
```

これで `ios/` フォルダが生成され、Xcodeプロジェクトができます。

### 4. Xcodeで開いて確認

```bash
npx cap open ios
```

Xcodeが開いたら：
- 「Signing & Capabilities」でご自身のApple Developerチームを選択
- シミュレータで一度実行し、正常に動作するか確認
- アプリアイコン（`icons/icon-1024.png` を1024×1024のApp Iconとして設定）

### 5. 動作確認で特に見ておきたい点

- LocalStorageのデータが正しく保存・読込されるか（サンドボックス環境が変わるため、念のため確認）
- 画像共有機能（Web Share API）がネイティブの共有シートと連携して動くか
  - 動作しない場合は `@capacitor/share` プラグインへの置き換えが必要になる可能性があります
- ダークモード・セーフエリア（ノッチ・ホームバー）の表示崩れがないか

### 6. 広告SDK・App内課金の組み込み（このアプリ側の対応が別途必要）

現在のコードには、以下の**モック（プレースホルダー）**が入っています。ネイティブ化のこのタイミングで、
実際のSDK呼び出しに差し替えてください。

| 関数名 | 現在の内容 | 置き換え先 |
|---|---|---|
| `showInterstitialAdMock()` | ダミーの広告ダイアログを表示するだけ | 例：Google AdMob の `@capacitor-community/admob` 等でインタースティシャル広告を表示 |
| `openPremiumPaywallDialog()` 内の購入処理 | ローカルの `isPremium` フラグをtrueにするだけ | `@capacitor-community/in-app-purchases`（またはRevenueCat等）でStoreKitの購入処理を呼び出す |
| `restorePurchasesMock()` | ローカルのフラグを確認するだけ | 同上のSDKで、実際の購入履歴（エンタイトルメント）を確認する処理に差し替える |

いずれの関数も `index.html` 内の1箇所にまとまっているため、差し替え作業自体は比較的簡単なはずです。

### 7. App Store Connect側の準備

- App Store Connect でアプリを新規作成（Bundle IDを上記と一致させる）
- スクリーンショット（6.7インチ・6.5インチなど必須サイズ）
- アプリ説明文、キーワード、カテゴリ（「ユーティリティ」または「ゲーム＞テーブル」等）
- **プライバシーポリシーのURL**（同梱の `privacy.html` を、GitHub Pages等で公開しそのURLを指定）
- 「App のプライバシー」質問票への回答（広告識別子の使用、購入情報の扱いなどを申告）
- App内課金（Non-Consumable、買い切り）をApp Store Connect側でも登録

### 8. 審査提出前のチェックリスト

- [ ] プライバシーポリシーのURLが実際にアクセスできる状態か
- [ ] `privacy.html` 内の `[ ]` で囲われたプレースホルダーを全て実際の情報に置き換えたか
- [ ] 「購入を復元」ボタンが動作するか（Appleのレビューで必ず確認されます）
- [ ] 審査担当者がテストできるよう、サンプルデータを最初から入れておく、または操作手順を「App Review情報」に記載したか
- [ ] 広告SDKを使う場合、App Tracking Transparency（ATT）のダイアログが正しく表示されるか

---

## Macを持っていない場合：Codemagicでのクラウドビルド

MacBookが手元にない場合、上記の手順3〜6（`npx cap add ios`やXcodeでの確認）を、Codemagicのクラウド上のMacで代行させることができます。

### A. 前提として必要なもの

- このプロジェクト一式を置いた**GitHubリポジトリ**（Codemagicはgitリポジトリを起点にビルドします）
- Apple Developer Program登録（$99/年）※これはブラウザから登録可能で、Macは不要です
- Codemagicアカウント（[codemagic.io](https://codemagic.io) で作成）

### B. 手順

1. GitHubにこのプロジェクト一式をpush（`.git`管理下に置く）
2. Codemagicにログイン → 「Add application」→ GitHubリポジトリを選択
3. 同梱の `codemagic.yaml` をリポジトリのルートに置いておくと、Codemagicが自動的にこの設定を読み込みます
4. `codemagic.yaml` 内の以下を、ご自身の情報に書き換える：
   - `BUNDLE_ID`：`capacitor.config.json` の `appId` と一致させる
   - `recipients`：ビルド結果の通知を受け取りたいメールアドレス
5. Codemagicの管理画面で **App Store Connect の連携**を設定
   - Apple Developer サイトで「App Store Connect API キー」を発行（Users and Access > Integrations > App Store Connect API）
   - 発行したキー（.p8ファイル、Key ID、Issuer ID）をCodemagicの「Team integrations」に登録
   - この連携により、Codemagicが証明書・プロビジョニングプロファイルを自動生成し、TestFlightへのアップロードまで自動化できます
6. 「Start new build」を押すと、クラウド上でXcodeビルドが走り、成功すればTestFlightに配信されます

### C. つまずきやすいポイント

- **`npx cap add ios` は一度だけローカル（または初回のCodemagicビルド）で実行し、生成された `ios/` フォルダごとGitHubにコミットしておく**のが確実です。以後のビルドではこのフォルダを流用します。
- CocoaPodsのエラーが出た場合、`ios/App/Podfile.lock` が壊れている可能性があるため、`pod install` をやり直すステップをワークフローに追加してください（サンプルの `codemagic.yaml` には既に含めています）。
- 初回は無料枠（月500分）を使い切りやすいので、ビルドが失敗する場合はまずログをよく確認してから再実行するのがおすすめです。

---

## Capacitorそのものの`ios/`フォルダ作成をどうするか

「MacもCodemagicも初回セットアップだけ誰かに頼みたい」という場合、`npx cap add ios` の実行と最初のコミットさえ済んでいれば、以降の修正・再ビルドはCodemagic経由で完結できます。この最初の一歩（`ios/`フォルダの生成）だけは、クラウドMac（MacinCloud等）を数時間だけ借りる、またはCodemagicのビルドスクリプト内で毎回自動生成する（上記のサンプル`codemagic.yaml`はこちらの方式）、のどちらかで対応可能です。

---

以上が大まかな流れです。実際に着手して、エラーや詰まった箇所が出てきたら、そのエラーメッセージを共有していただければ、原因の切り分けや修正案をこちらで一緒に検討できます。

