"""Build a capture-only copy of the game in ./site (the real game files are not changed).

- Turns the ranking off so recording never counts plays or sends scores.
- Exposes game state as window.__pv so scenes can be set up.
- Lets the recorder run exactly one game frame per video frame (window.__raf).
"""
import pathlib, shutil

root = pathlib.Path(__file__).resolve().parents[2]
site = pathlib.Path('site')
shutil.rmtree(site, ignore_errors=True)
site.mkdir()
for name in ['index.html', 'ranking-client.js']:
    shutil.copy(root / name, site / name)
for name in ['vendor', 'assets']:
    shutil.copytree(root / name, site / name)

p = site / 'index.html'
s = p.read_text(encoding='utf-8')
def sub(old, new, count=1):
    global s
    assert s.count(old) == count, old
    s = s.replace(old, new)
sub("const ranking = window.MedjedRanking;", "const ranking = null;")
sub("    (function () {\n      'use strict';",
    "    window.__raf = (cb) => window.__manual ? (window.__rafq.push(cb), 0) : requestAnimationFrame(cb);\n    (function () {\n      'use strict';")
sub("          requestAnimationFrame(tick);", "          window.__raf(tick);")
sub("""        requestAnimationFrame(tick);
      });
    })();""", """        window.__pv = {
          get state(){return gameState;}, set state(v){gameState=v;},
          get wave(){return currentWave;}, get lv(){return playerLv;}, set lv(v){playerLv=v;},
          startNewRun, startWave, selectSkillChoice, openLevelUpModal, renderSkillStrip, updateExpHud, showBanner,
          get choices(){return currentChoices;},
          skills, player, enemies, souls, boss, gems, audio, sceneManager, input,
        };
        window.__raf(tick);
      });
    })();""")
p.write_text(s, encoding='utf-8')
print('capture site ready in', site.resolve())
