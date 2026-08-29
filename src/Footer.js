// src/Footer.js
// 各データ提供元へのクレジット表示。EDRDG(JMdict)のライセンス条件で
// 「画面ごとに出典を表示すること」が求められているため、全ページ共通のフッターとして表示する。
import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <p>本サイトは以下のデータを利用しています:</p>
      <ul>
        <li>
          <a href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project" target="_blank" rel="noreferrer">
            JMdict
          </a>{' '}
          — Electronic Dictionary Research and Development Group (CC BY-SA 4.0)
        </li>
        <li>
          <a href="https://bond-lab.github.io/wnja/" target="_blank" rel="noreferrer">
            日本語WordNet
          </a>{' '}
          — NICT
        </li>
        <li>
          <a href="https://ko.wiktionary.org/" target="_blank" rel="noreferrer">
            한국어 위키낱말사전 (Korean Wiktionary)
          </a>{' '}
          (CC BY-SA 4.0)
        </li>
      </ul>
    </footer>
  );
}
