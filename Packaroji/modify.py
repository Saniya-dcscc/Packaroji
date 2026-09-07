from pathlib import Path
import re
p=Path('/mnt/data/v14work/templates/index.html')
s=p.read_text()

# Locate all packaging category sections by their marker and section end.
marker='<!-- =====================================================\n     PACKAGING CATEGORIES\n===================================================== -->'
starts=[m.start() for m in re.finditer(re.escape(marker), s)]
if len(starts) != 2:
    raise SystemExit(f'Expected 2 packaging category sections, found {len(starts)}')

def section_end(text, start):
    pos=text.find('</section>', start)
    if pos < 0: raise SystemExit('No section end')
    return pos+len('</section>')

first_start, second_start = starts
first_end=section_end(s, first_start)
second_end=section_end(s, second_start)
first_block=s[first_start:first_end]
second_block=s[second_start:second_end]
# They should be duplicates; retain the first.
s=s[:second_start] + s[second_end:]

# Re-find the WHY PACKAROJI block and remove it from its old location.
feat_marker='<!-- =====================================================\n     WHY PACKAROJI\n===================================================== -->'
feat_start=s.index(feat_marker)
feat_end=section_end(s, feat_start)
feat_block=s[feat_start:feat_end]
s=s[:feat_start] + s[feat_end:]

# Reorder feature cards: Takeaway, Business, Easy ordering, Responsible.
articles=re.findall(r'\s*<article class="feature-card">.*?</article>', feat_block, flags=re.S)
if len(articles)!=4:
    raise SystemExit(f'Expected 4 feature cards, found {len(articles)}')
by_title={re.search(r'<h3>\s*(.*?)\s*</h3>', a, re.S).group(1).strip():a for a in articles}
order=['Takeaway focused','Business friendly','Easy ordering','Responsible choices']
ordered=[]
for title in order:
    if title not in by_title: raise SystemExit(f'Missing feature card {title}')
    ordered.append(by_title[title])
new_grid='\n\n        <div class="feature-grid">\n' + ''.join('\n'+a+'\n' for a in ordered) + '\n\n        </div>'
feat_block=re.sub(r'\s*<div class="feature-grid">.*?</div>\s*\n\s*</div>\s*\n\s*</section>', new_grid+'\n\n    </div>\n\n</section>', feat_block, count=1, flags=re.S)

# Insert WHY PACKAROJI immediately before the retained first packaging categories block.
pack_pos=s.index(marker)
s=s[:pack_pos] + feat_block + '\n\n' + s[pack_pos:]

# Remove any old "See the product range" CTA if still present.
s=re.sub(r'\s*<a class="btn btn-primary" href="#products">See the product range <span>→</span></a>\s*', '\n', s)

p.write_text(s)
