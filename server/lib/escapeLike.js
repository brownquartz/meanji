// server/lib/escapeLike.js
// SQLのLIKE検索に使う文字列内の特殊文字（%, _, バックスラッシュ自身）をエスケープする。
// これをやらないと、ユーザーが検索語に % や _ を含めた場合に意図しないワイルドカード
// 展開が起きてしまう（例: "50%" で検索したつもりが、% がワイルドカードとして働く）。
function escapeLike(input) {
  return input.replace(/[%_\\]/g, m => `\\${m}`);
}

module.exports = { escapeLike };
