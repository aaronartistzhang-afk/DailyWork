# skill-evolve-loop — sediment a lesson into a living skill, then prove you didn't break it

When a real run teaches you something and you want it folded into a skill that **already ships**, the risk isn't writing the new paragraph — it's silently breaking behavior that used to work, or overwriting a sibling session's concurrent edit. This loop fixes the edit path: smallest-section locate → propose-diff-first → **five-class behavior regression** via parallel subagents → backfill only what failed.

- **Stack**: pure prompt (needs an environment that can spawn parallel subagents for the test classes).
- **Required**: nothing.
- **Scope**: editing skills that already exist. Not for creating new skills, not for blind-repro acceptance of a packaged skill.

## The problem it kills

"Fold this lesson into the skill" edits usually ship untested — and the failure is invisible: the skill still *looks* right, the happy path still works, and the broken trigger word or the wrong command sits there until someone trips on it weeks later. The five-class table makes each failure mode a checked box instead of a surprise:

| Class | Catches |
|---|---|
| Routing | New triggers don't hit / old scenarios stopped routing |
| Regression | The edit changed behavior that used to work |
| Discipline | A gate or taboo got loosened by accident |
| Content | The added text itself is wrong (quote doesn't match source, command doesn't run) |
| Gate-under-pressure | The gate holds on the happy path but folds under an adversarial poke |

## Rules worth stealing even without the skill

- **Propose the diff before touching a shared skill** — every future session inherits your edit.
- **The abstraction dial**: too concrete = one run's table names baked in as "method"; too abstract = the how-to-fetch and how-to-compute stripped out. Fix the method, look up specifics fresh, always keep the commands.
- **Re-read the latest version right before writing** — concurrent sessions cause version drift, and a stale read overwrites someone's work.

## When to use

Triggers (bilingual): "沉淀到 skill 里边" · "把这轮教训写进 skill" · "skill 更新了跑一轮验证" · "改后回归" · "fold this lesson into the skill" · "post-change regression" · "did my skill edit break anything".
