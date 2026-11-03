import {create as createViralV2} from './scenes/viral-v2.js';
import {create as createViralV1} from './scenes/viral-v1.js';
import {templates as viral,create as createViral} from './scenes/viral.js';
import {templates as physics,create as createPhysics} from './scenes/physics.js';
import {templates as asmr,create as createASMR} from './scenes/asmr.js';
import {templates as surreal,create as createSurreal} from './scenes/surreal.js';
import {templates as chain,create as createChain} from './scenes/chain.js';
export const CATALOG=[...viral,...physics,...asmr,...surreal,...chain];
const factories={viral:createViral,ball:createPhysics,asmr:createASMR,meme:createSurreal,domino:createChain};
export function templatesFor(genre){return genre==='random'?CATALOG:CATALOG.filter(t=>t.genre===genre)}
export function templateFor(id,genre='ball'){return CATALOG.find(t=>t.id===id&&t.genre===genre)||templatesFor(genre)[0]}
export function studioScene(genre,seed,options={}){const template=templateFor(options.templateId,genre);if(!template)throw Error('Template not found');return (genre==='viral'&&options.engineVersion==='viral-1'?createViralV1:genre==='viral'&&options.engineVersion==='viral-2'?createViralV2:factories[genre])(template.id,seed,options)}
export function englishMetadata(template,seed){
 const hooks=['Wait for the final move','One tiny change, a different ending','Follow the motion','The last second changes everything'];
 const title=`${template.name} - ${hooks[seed%hooks.length]}`;
 const tags={viral:'#BouncingBall #Neon #PhysicsSimulation',ball:'#Physics #Simulation #BouncingBalls',asmr:'#OddlySatisfying #ASMR #ProceduralArt',meme:'#Surreal #OriginalCharacter #Animation',domino:'#ChainReaction #Domino #KineticArt'};
 return {title,tags:`#Shorts #OriginalAnimation ${tags[template.genre]}`,caption:template.caption||template.name};
}
export function productionAssessment(template,recording={}){
 // Transparent production checks, never a popularity or revenue prediction.
 return {kind:'production_checks_not_popularity',template_id:template.id,visual_quality:'Manual review required',smoothness:recording.p95FrameMs?{p95_frame_ms:recording.p95FrameMs,observed_fps:recording.renderedFrames/(recording.elapsedSeconds||1)}:null,satisfaction:'Manual review required',story:template.hook||template.description,sound_sync:recording.soundEvents??null,loop:template.loop||'reset',originality:'Procedural original geometry; not a legal guarantee',mobile_readability:'Keep focal objects inside safe frame; manually inspect phone',reference_principles:['clear opening stakes','visible causal motion','timed payoff'],social_performance:null};
}

