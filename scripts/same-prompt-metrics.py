"""Measure generated media; do not treat production metrics as human preference."""
from pathlib import Path
import json,subprocess,wave,array,math
ROOT=Path(__file__).resolve().parents[1];base=ROOT/'reports/same-prompt';results=[]
def floats(path):return array.array('f',subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar','48000','-f','f32le','-']))
def envelope(samples,size=480):return [math.sqrt(sum(v*v for v in samples[i:i+size])/size) for i in range(0,len(samples)-size,size)]
for mode in ['seed-10','seed-40','seed-47']:
 p=base/(mode+'.json');f=base/(mode+'.mp4');ref=base/(mode+'-reference.wav')
 if not p.exists() or not ref.exists():continue
 d=json.loads(p.read_text());a=envelope(floats(f));r=envelope(floats(ref));scores=[]
 for lag in range(-10,31):
  pairs=[(r[i],a[i+lag]) for i in range(max(0,-lag),min(len(r),len(a)-lag))];dot=sum(x*y for x,y in pairs);norm=math.sqrt(sum(x*x for x,y in pairs)*sum(y*y for x,y in pairs));scores.append((dot/(norm or 1),lag))
 corr,lag=max(scores);audio_start=float(next(s for s in d['probe']['streams'] if s['codec_type']=='audio').get('start_time',0));lead=d['stats']['quality'].get('visualTimelineOffsetSeconds',d['stats']['quality']['leadSeconds']);offsets=json.loads((base/'video-offset.json').read_text()) if (base/'video-offset.json').exists() else [];lead=next((v['video_timeline_offset_seconds'] for v in offsets if v['mode']==mode),lead);residual=lag*.01+audio_start-lead
 frames=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-select_streams','v','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(f)]))['frames'];pts=[float(frame['best_effort_timestamp_time']) for frame in frames];gaps=[b-a for a,b in zip(pts,pts[1:])];assert len(pts)==d.get('native_frames',len(pts)), 'Transcode must preserve native frame count'
 decoded=floats(f);peak=max(abs(v) for v in decoded);row={'mode':mode,'audio_envelope_correlation':corr,'audio_lead_measured_seconds':lag*.01+audio_start,'audio_stream_start_seconds':audio_start,'expected_lead_seconds':lead,'audio_timeline_residual_seconds':residual,'encoded_audio_peak':peak,'video_frames':len(pts),'native_video_frames':d.get('native_frames'),'frame_count_preserved':len(pts)==d.get('native_frames',len(pts)),'encoded_average_fps':(len(pts)-1)/(pts[-1]-pts[0]),'max_encoded_frame_gap_seconds':max(gaps),'max_active_frame_gap_seconds':max(y-x for x,y in zip(pts,pts[1:]) if x>.2 and y<d['settings']['duration']-.8),'missed_draw_frames':d['stats']['quality']['missedDisplayFrames'],'physics':d['world']['stats'],'outcome':d['world']['outcome'],'limits':'10ms envelope bins; not a human listening test. Encoded-frame sampling quantizes collision visibility by up to one captured frame; target60fps, actual intervals measured.'};assert corr>.96,row;assert abs(residual)<=.03,row;assert max(gaps)<.1,row;assert peak<.98,row;assert row['physics']['budgetStops']==0,row;results.append(row)
assert len(results)==3
metadata=[json.loads((base/(name+'.json')).read_text()) for name in ['seed-10','seed-40','seed-47']]
assert len({d['promptHash'] for d in metadata})==1
inputs=[{k:v for k,v in d['settings'].items() if k!='seed'} for d in metadata]
assert inputs[0]==inputs[1]==inputs[2]
assert all(d['world']['cleared']==3 for d in metadata)
import hashlib
assert all(hashlib.sha256(d['prompt'].encode()).hexdigest()==d['promptHash'] for d in metadata)
(base/'metrics.json').write_text(json.dumps({'results':results,'iphone_hardware':'UNTESTED'},indent=2));print(json.dumps(results,indent=2))
