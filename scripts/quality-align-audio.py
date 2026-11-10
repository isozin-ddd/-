"""Apply one measured alignment procedure to every clip; never alter physics or seed."""
from pathlib import Path
import json,subprocess,argparse
R=Path(__file__).resolve().parents[1];p=argparse.ArgumentParser();p.add_argument('--experiment',action='store_true');a=p.parse_args();base=R/('reports/same-prompt' if a.experiment else 'reports/quality');metrics=json.loads((base/'metrics.json').read_text())
for row in metrics['results']:
 folder=base if a.experiment else base/'after';name=row['mode'];movie=folder/(name+'.mp4');meta=folder/(name+'.json');d=json.loads(meta.read_text());delta=row['audio_timeline_residual_seconds'];assert abs(delta)<.15,'Large timing error needs investigation'
 original=folder/(name+'-unaligned.mp4')
 if d.get('alignment'):
  assert abs(delta)<=.03,'Previously aligned clip drifted';continue
 assert not original.exists(),'Do not repeatedly align a clip'
 movie.rename(original);temp=folder/(name+'-aligned.mp4')
 subprocess.run(['ffmpeg','-v','error','-y','-copyts','-i',str(original),'-itsoffset',str(-delta),'-i',str(original),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',str(temp)],check=True)
 def pts(f):return subprocess.check_output(['ffprobe','-v','quiet','-select_streams','v','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(f)])
 assert json.loads(pts(original))==json.loads(pts(temp)),'Audio remux must preserve every video timestamp'
 temp.rename(movie);d['pre_alignment_metrics']=row;d['alignment']={'method':'lossless audio packet timestamp shift by measured residual; same algorithm for all seeds','audio_timestamp_shift_seconds':-delta};d['probe']=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(movie)]));meta.write_text(json.dumps(d,indent=2));print('aligned',name,delta,flush=True)
