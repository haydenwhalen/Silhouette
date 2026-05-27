/**
 * magnet-probes.ts — a shared bank of diverse, realistic user queries per MVP state.
 *
 * Used by:
 *   - scripts/diagnose-retrieval-magnets.ts  (measure per-SIO win-rate / dominance)
 *   - scripts/test-magnet-risk.ts            (promotion-time magnet-risk gate)
 *
 * Design: within each state the probes deliberately span different tones, variants,
 * insight needs, and specificity levels. In a HEALTHY corpus, wins spread across the
 * SIOs whose register/type/variant matches each probe. A "magnet" SIO (broadly/generically
 * relevant) instead wins a disproportionate share of the probes regardless of their cue —
 * that concentration is what the win-rate metric detects.
 *
 * These are author-written probes (a known limitation — they are not real user logs).
 */

import type { MvpState } from "../../src/rag/retrievalConfig";

export const MAGNET_PROBES: Record<MvpState, string[]> = {
  "direction-collapse": [
    "I got the promotion I worked years for and I feel completely empty. I don't know what comes next.",
    "I have no idea what I actually want to do with my life and I never really have.",
    "My life looks good on paper but none of it adds up to anything that feels like it matters.",
    "Everyone around me seems to know what they're doing and I'm 29 with no thing of my own.",
    "I've journaled and taken every assessment and I'm no closer to knowing my direction.",
    "I keep asking what my purpose is and I just come up blank — what's the point of any of it?",
    "I finally hit the income goal I set and it changed nothing about how I feel. Why?",
    "Should I be chasing a passion? I don't think I have one and that scares me.",
    "I built the career everyone told me to want and now I feel like I'm living someone else's life.",
    "I feel adrift, like I'm drifting through my twenties without a rudder.",
  ],
  "engagement-drought": [
    "I used to love this work and now I open my laptop and feel nothing. Why does this happen?",
    "I'm furious with myself for being so checked out. I should still care about this.",
    "I'm running on fumes. Stopping feels like failing, but there's nothing left in me.",
    "I keep telling myself I'll feel better about work once things calm down, but that day never comes.",
    "The work hasn't changed but I've checked out — I have no say in how I do it and nothing's building toward anything.",
    "It's not depression exactly, more like static. The hours pass, I'm functional, but the spark is gone.",
    "I'm just going through the motions at a job I used to be excited about.",
    "I feel numb about everything at work and I can't tell if it's the job or me.",
    "I want to understand the actual science of why motivation fades like this.",
    "I keep performing positivity at work while feeling completely flat underneath it.",
  ],
  "inaction-loop": [
    "I keep ending up in the same rut and it feels like it's all my fault — I'm doing this to myself.",
    "I just need someone to stop coddling me and give me a kick. No more excuses.",
    "I set goals constantly and know what to do, but nothing changes month to month. I want to understand why.",
    "I've known exactly what I need to do for two years and I still don't do it.",
    "I've read every productivity book and 'lazy' doesn't feel right — I need a better frame for this.",
    "Every time I have the impulse to start, I talk myself out of it before I move.",
    "I do everything except the one thing that matters, and then I quietly hate myself.",
    "I won't ship anything unless it's perfect, so I never ship anything.",
    "I'm so scared whatever I make won't be good enough that I freeze and make nothing.",
    "I keep waiting to feel motivated before I start, and the motivation never reliably comes.",
  ],
  // ── Six-State Buildout additions (author-written probes; not real user logs) ──
  "possibility-paralysis": [
    "I have three different career paths I could take and I've been weighing them for a year.",
    "I'm terrified that if I commit to one idea I'll find out it was the wrong one.",
    "I keep researching my options instead of actually picking one and starting.",
    "Every time I get close to choosing, another possibility shows up and I freeze again.",
    "I don't know which of my ideas is the real one and which are just distractions.",
    "Keeping my options open used to feel smart; now it feels like a cage I built.",
    "How do people commit to one path when they can't be sure it's the right one?",
    "I have too many things I could be good at and I'm doing none of them.",
  ],
  "identity-transition": [
    "I left the career I'd built for a decade and I don't know who I am without it.",
    "Since my divorce I feel like a stranger to myself.",
    "I retired from competing and the thing that organized my whole life is just gone.",
    "I sold my company and thought I'd feel free, but I feel lost without it.",
    "Everyone calls this a fresh start but I just feel like I lost myself somewhere.",
    "I'm in some in-between place — the old me is gone and I can't see the new one yet.",
    "How do you rebuild who you are after the thing that defined you ends?",
    "I feel smaller than I used to be, like I left the best version of myself behind.",
  ],
  "momentum-gap": [
    "My friend just raised a seed round and I feel like I've wasted my twenties.",
    "Everyone at the reunion seemed so far ahead and I can't shake the feeling I'm behind.",
    "I don't want their exact life, I just want that feeling of going somewhere.",
    "Why does it feel like everyone got a roadmap and I didn't?",
    "I had a great gym routine, fell off for two months, and now restarting feels impossible.",
    "I broke my writing streak and now I feel like a fraud trying to start again.",
    "One missed week turned into three months and I can't get back into motion.",
    "How do I restart something I quit without feeling like I already failed?",
  ],
};

export const ALL_STATES: MvpState[] = [
  "direction-collapse",
  "engagement-drought",
  "inaction-loop",
  "possibility-paralysis",
  "identity-transition",
  "momentum-gap",
];
