# meanji

日本語の単語辞書検索サイト。[kanatomy](https://github.com/brownquartz/kanatomy)（漢字分解ツール、旧kanji-dict）から辞書機能だけを切り出したもの。

## データソース

- JMdict, Japanese WordNet, 韓国語版ウィクショナリー(すべてクリーンな商用利用可能ライセンス)
- **CJKVI-IDS(GPL)のような懸念のあるデータには一切依存していない**（kanatomyのコード・データベースを一切参照しない）

## 構成

- `src/`: Reactフロントエンド（検索ページ・単語詳細ページ）
- `server/`: Express API(`/api/words/search`, `/api/word/:text`, `/api/kanji-words/:char`)
- `scripts/`: `words`テーブルへのデータ投入スクリプト(import-jmdict.js / import-wordnet-words.js / import-kowiktionary-words.js)

`/api/kanji-words/:char` は kanatomy の漢字詳細ページから呼ばれる想定（kanatomy → meanji の一方向依存のみ）。

## Go to page

TODO: 本番デプロイ後、URLをここに記載
