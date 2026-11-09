/** One controlled recipe, not a free-form text-to-video model. Prompt text is
 * validated exactly and compiled to a pinned quality-1 configuration. */
export const EXPERIMENT_VERSION='same-prompt-1';
export const COMMON_PROMPT=`15秒の縦型9:16、720×1280、60fps目標のオリジナルなボールとリングの物理シミュレーションを制作する。
内部座標は540×960。中心(270,462)に半径105・161・217、線幅6の同心リングを3本置く。隙間幅は1.05rad、初期角は-1.65radからリングごとに1.8radずらし、回転速度は時計・反時計・時計の順に0.65rad/sで固定する。
半径11、質量121の光沢ある紫の球を(270,440)に1個置く。初速の大きさ255px/s、下向き重力165px/s²、反発係数0.97、接触摩擦0.012、空気抵抗0.006/sを共通にする。固定120Hzと連続衝突判定を使い、丸い円弧端点も判定する。
暗い青の背景、シアン・紫・琥珀のリング、抑えた発光、短い残像、固定カメラ、同じ英語見出しを使用する。境界は可視の壁とする。球全体が本物の隙間を通過したリングだけを開放し、終盤に隙間を広げたり成功を強制したりしない。
独自に合成した衝突音・突破音・ゴール音をイベント時刻に同期する。音色・ミックス・ピーク処理は同一の手順を使い、BGMと他人の音源は使わない。終端0.8秒は実際の結果カードを表示し、未達ならTIME UPとする。
変更できる入力は外部から渡すランダムシードのみ。シードは初速度の方向に作用し、文章、物理定数、構図、色、音声処理、尺、解像度を動画ごとに変更しない。`;
export const SEEDS=Object.freeze([10,40,47]);
export const COMMON_SETTINGS=Object.freeze({genre:'viral',templateId:'viral-escape',engineVersion:'quality-1',width:720,duration:15,sfx:true,bgm:'off',caption:true,qualitySettings:Object.freeze({rings:3,balls:1,phase:-1.65,gap:1.05,rotation:.65,direction:'alternate',gravity:165,restitution:.97,speed:255,maxBalls:32,multiplyWhen:'hit',eliminateWhen:'escape',obstacles:'chicane',ending:'winner'})});
export const ENCODING=Object.freeze({videoCodec:'libx264',crf:18,preset:'veryfast',pixelFormat:'yuv420p',audioCodec:'aac',audioBitrate:'160k',fpsMode:'passthrough'});
export function compilePrompt(prompt,seed){if(prompt!==COMMON_PROMPT)throw Error('共通プロンプトの文章が変更されています。この固定実験では受け付けません。');if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('シードはuint32整数です');return {prompt,settings:{...COMMON_SETTINGS,qualitySettings:{...COMMON_SETTINGS.qualitySettings},seed}}}
export async function sha256(text){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('')}
export function stripSeed(settings){const copy=JSON.parse(JSON.stringify(settings));delete copy.seed;return copy}
