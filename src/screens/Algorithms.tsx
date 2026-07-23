/**
 * Algorithms — a native, theme-aware CS study screen built from the app's own design
 * language (cards, chips, search, tokens). No iframe: everything renders with the same
 * CSS variables as the rest of FearlessMath, so it follows light/dark and every theme.
 *
 * Content: the algorithms every CS / engineering student and interviewee must know —
 * searching, sorting, graphs, dynamic programming, greedy, backtracking, plus the core
 * toolkit — each with idea, complexity, clean Python, and when-to-use guidance. Three
 * live React visualizers: Big-O growth chart, binary-search stepper, sorting animation.
 */
import { useEffect, useMemo, useRef, useState } from "react";

/* ─────────────────────────── data model ─────────────────────────── */

type CatId = "foundations" | "searching" | "sorting" | "graphs" | "paradigms" | "toolkit" | "interview" | "roadmap";

const CATS: { id: CatId; icon: string; label: string }[] = [
  { id: "foundations", icon: "🧭", label: "Foundations" },
  { id: "searching", icon: "🔎", label: "Searching" },
  { id: "sorting", icon: "📊", label: "Sorting" },
  { id: "graphs", icon: "🕸️", label: "Graphs" },
  { id: "paradigms", icon: "🧩", label: "Paradigms" },
  { id: "toolkit", icon: "🧰", label: "Toolkit" },
  { id: "interview", icon: "🎤", label: "Interview" },
  { id: "roadmap", icon: "🗺️", label: "Roadmap" },
];

type Badge = { text: string; tone?: "ok" | "warn" | "bad" | "plain" };
type Algo = {
  id: string; cat: CatId; name: string; star?: boolean; tags: string;
  idea: string;
  kv?: string[];               // small complexity chips, e.g. "Best|O(1)"
  code?: string; lang?: string;
  good?: string; avoid?: string;
  note?: string;
  badges?: Badge[];
};

const ALGOS: Algo[] = [
  /* Searching */
  {
    id: "linear", cat: "searching", name: "Linear search", tags: "sequential unsorted scan",
    idea: "Walk through the list one item at a time until you find the target — the only option when data is unsorted.",
    kv: ["Best|O(1)", "Avg/Worst|O(n)", "Space|O(1)"],
    badges: [{ text: "O(n)", tone: "ok" }],
    lang: "python",
    code: `def linear_search(arr, target):
    for i, x in enumerate(arr):
        if x == target:
            return i          # found — return the index
    return -1                 # not found`,
    good: "Data is unsorted, small, or searched only once.",
    avoid: "Data is sorted or searched repeatedly — use binary search or a hash set.",
  },
  {
    id: "binary", cat: "searching", name: "Binary search", star: true, tags: "sorted halve logarithmic divide",
    idea: "On a SORTED array, look at the middle element and throw away half the search space each step. The single most important 'halving' idea in computing.",
    kv: ["Best|O(1)", "Avg/Worst|O(log n)", "Space|O(1)"],
    badges: [{ text: "O(log n)", tone: "ok" }, { text: "needs sorted input", tone: "plain" }],
    lang: "python",
    code: `def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2   # avoids overflow
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1            # go right
        else:
            hi = mid - 1           # go left
    return -1`,
    good: "The array is sorted, or you can binary-search on an answer (see patterns).",
    avoid: "Data is unsorted or changes constantly.",
    note: "Classic bugs: <= vs <, forgetting mid ± 1 (infinite loop), and integer overflow on (lo+hi).",
  },
  /* Sorting */
  {
    id: "insertion", cat: "sorting", name: "Insertion sort", tags: "simple nearly sorted stable cards",
    idea: "Build a sorted prefix by inserting each new element into place, like sorting a hand of cards. Excellent for small or nearly-sorted data — real libraries use it for tiny sub-arrays.",
    kv: ["Best|O(n)", "Worst|O(n²)", "Space|O(1)", "Stable|✔"],
    badges: [{ text: "O(n²) worst · O(n) nearly-sorted", tone: "warn" }],
    lang: "python",
    code: `def insertion_sort(a):
    for i in range(1, len(a)):
        key, j = a[i], i - 1
        while j >= 0 and a[j] > key:   # shift bigger elements right
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return a`,
  },
  {
    id: "merge", cat: "sorting", name: "Merge sort", star: true, tags: "divide conquer stable n log n recursion",
    idea: "Divide & conquer: split in half, sort each half recursively, then MERGE the two sorted halves in linear time. Guaranteed O(n log n) in every case — the reliable choice, and the standard for linked lists and huge/external data.",
    kv: ["All cases|O(n log n)", "Space|O(n)", "Stable|✔"],
    badges: [{ text: "O(n log n) always", tone: "ok" }, { text: "stable", tone: "plain" }],
    lang: "python",
    code: `def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left  = merge_sort(a[:mid])
    right = merge_sort(a[mid:])
    return merge(left, right)

def merge(l, r):
    out, i, j = [], 0, 0
    while i < len(l) and j < len(r):
        if l[i] <= r[j]: out.append(l[i]); i += 1
        else:            out.append(r[j]); j += 1
    out.extend(l[i:]); out.extend(r[j:])
    return out`,
    good: "You need guaranteed speed, stability, or you're sorting linked lists / external data.",
    avoid: "Memory is tight — it needs O(n) extra space.",
  },
  {
    id: "quick", cat: "sorting", name: "Quick sort", star: true, tags: "pivot partition in place average fastest",
    idea: "Pick a PIVOT, PARTITION so smaller elements go left and larger go right, then recurse on each side. Sorts in place and is usually the fastest in practice — the default in many standard libraries.",
    kv: ["Best/Avg|O(n log n)", "Worst|O(n²)", "Space|O(log n)", "Stable|✗"],
    badges: [{ text: "O(n log n) avg", tone: "ok" }, { text: "O(n²) worst", tone: "bad" }],
    lang: "python",
    code: `def quick_sort(a, lo=0, hi=None):
    if hi is None: hi = len(a) - 1
    if lo < hi:
        p = partition(a, lo, hi)
        quick_sort(a, lo, p - 1)
        quick_sort(a, p + 1, hi)
    return a

def partition(a, lo, hi):
    pivot = a[hi]; i = lo - 1        # Lomuto scheme
    for j in range(lo, hi):
        if a[j] <= pivot:
            i += 1
            a[i], a[j] = a[j], a[i]
    a[i + 1], a[hi] = a[hi], a[i + 1]
    return i + 1`,
    note: "The O(n²) worst case hits when the pivot is always smallest/largest. Fix with a random pivot or median-of-three; real libraries use introsort (quicksort that falls back to heap sort).",
  },
  {
    id: "heap", cat: "sorting", name: "Heap sort & the heap", tags: "binary heap priority queue in place top k",
    idea: "A binary heap (a tree stored in an array where each parent ≥ its children) gives max/min in O(1) and insert/remove in O(log n) — that's a PRIORITY QUEUE. Heap sort builds a heap then pops the max repeatedly.",
    kv: ["All cases|O(n log n)", "Space|O(1)", "Stable|✗"],
    badges: [{ text: "O(n log n) always", tone: "ok" }, { text: "in place", tone: "plain" }],
    note: "The real prize is the priority queue — it powers Dijkstra, Huffman coding, schedulers, and 'top-K' queries. Reach for a heap on 'k largest/smallest/closest' or 'merge k sorted…'.",
  },
  /* Graphs */
  {
    id: "bfs", cat: "graphs", name: "Breadth-First Search (BFS)", star: true, tags: "queue shortest path unweighted level ripples",
    idea: "Explore a graph level by level from a start node using a QUEUE. On an unweighted graph, BFS finds the shortest path (fewest edges). Think ripples spreading on water.",
    kv: ["Time|O(V + E)", "Space|O(V)", "Shortest path (unweighted)|✔"],
    badges: [{ text: "O(V + E)", tone: "ok" }, { text: "uses a queue", tone: "plain" }],
    lang: "python",
    code: `from collections import deque

def bfs(graph, start):
    seen = {start}; q = deque([start]); order = []
    while q:
        node = q.popleft()            # FIFO — nearest first
        order.append(node)
        for nb in graph[node]:
            if nb not in seen:
                seen.add(nb); q.append(nb)
    return order`,
    good: "Shortest path in unweighted graphs, level-order, 'minimum steps' puzzles, flood fill.",
    avoid: "Weighted shortest paths — that needs Dijkstra.",
  },
  {
    id: "dfs", cat: "graphs", name: "Depth-First Search (DFS)", star: true, tags: "stack recursion cycle components backtracking",
    idea: "Go as DEEP as possible along one path, then backtrack. Uses recursion (the call stack) or an explicit stack. The backbone of cycle detection, connected components, topological sort, and most backtracking.",
    kv: ["Time|O(V + E)", "Space|O(V)"],
    badges: [{ text: "O(V + E)", tone: "ok" }, { text: "stack / recursion", tone: "plain" }],
    lang: "python",
    code: `def dfs(graph, node, seen=None):
    if seen is None: seen = set()
    seen.add(node)
    for nb in graph[node]:
        if nb not in seen:
            dfs(graph, nb, seen)      # dive deeper first
    return seen`,
    good: "Cycle detection, connected components, topological order, maze exploration, path existence.",
    avoid: "Shortest paths (DFS doesn't find them); watch stack depth on huge graphs.",
  },
  {
    id: "dijkstra", cat: "graphs", name: "Dijkstra's shortest path", star: true, tags: "weighted greedy priority queue heap routing maps",
    idea: "Shortest path from a source to every node with NON-NEGATIVE weights. A greedy algorithm powered by a priority queue: always expand the closest unfinished node next. The map-app / network-routing classic.",
    kv: ["Time|O((V+E) log V)", "Space|O(V)", "Non-negative weights"],
    badges: [{ text: "O((V + E) log V)", tone: "ok" }, { text: "needs a min-heap", tone: "plain" }],
    lang: "python",
    code: `import heapq

def dijkstra(graph, src):             # graph[u] = [(v, weight), ...]
    dist = {u: float('inf') for u in graph}
    dist[src] = 0
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:               # stale entry
            continue
        for v, w in graph[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(pq, (dist[v], v))
    return dist`,
    note: "Breaks with negative edges — use Bellman-Ford O(V·E) (also detects negative cycles). For all-pairs on small graphs, Floyd-Warshall O(V³).",
  },
  {
    id: "topo", cat: "graphs", name: "Topological sort", tags: "dag ordering dependencies kahn scheduling build",
    idea: "Order the nodes of a directed ACYCLIC graph so every edge points forward — every task after its prerequisites. Course scheduling, build systems, and spreadsheet recalculation rely on it.",
    kv: ["Time|O(V + E)", "DAGs only"],
    badges: [{ text: "O(V + E)", tone: "ok" }],
    lang: "python",
    code: `from collections import deque

def topo_sort(graph):
    indeg = {u: 0 for u in graph}
    for u in graph:
        for v in graph[u]: indeg[v] += 1
    q = deque([u for u in graph if indeg[u] == 0])
    order = []
    while q:
        u = q.popleft(); order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return order if len(order) == len(graph) else None  # None ⇒ cycle`,
  },
  {
    id: "dsu", cat: "graphs", name: "Union-Find (Disjoint Set)", tags: "connectivity kruskal mst path compression islands",
    idea: "Track items grouped into disjoint sets: answer 'are a and b together?' and 'merge these groups' almost instantly. With path compression + union by rank, each op is ~O(1) (inverse-Ackermann).",
    kv: ["Per op|≈ O(1) amortised"],
    badges: [{ text: "≈ O(1) per op", tone: "ok" }],
    lang: "python",
    code: `class DSU:
    def __init__(self, n):
        self.parent = list(range(n)); self.rank = [0]*n
    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # compress
            x = self.parent[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb: return False     # already connected ⇒ a cycle
        if self.rank[ra] < self.rank[rb]: ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]: self.rank[ra] += 1
        return True`,
    note: "Powers Kruskal's Minimum Spanning Tree (cheapest edges connecting everything). Prim grows the tree with a heap instead. Both are must-knows for 'connect all cities at minimum cost'.",
  },
  /* Paradigms */
  {
    id: "recursion", cat: "paradigms", name: "Recursion & divide-and-conquer", tags: "base case call stack master theorem",
    idea: "A function that calls itself on a smaller sub-problem until a BASE CASE stops it. Divide-and-conquer splits the problem, solves the pieces recursively, and combines — merge sort, quick sort, binary search all use it.",
    kv: ["Pattern|split · solve · combine"],
    lang: "python",
    code: `def factorial(n):
    if n <= 1:            # base case
        return 1
    return n * factorial(n - 1)   # recursive case`,
    note: "Always define the base case first, trust the recursion for smaller inputs, and remember the Master Theorem: split in halves + linear combine ⇒ O(n log n).",
  },
  {
    id: "dp", cat: "paradigms", name: "Dynamic Programming (DP)", star: true, tags: "memoization tabulation knapsack lcs fibonacci overlapping subproblems",
    idea: "Solve problems with OVERLAPPING sub-problems by solving each once and reusing the answer — turning exponential brute force into polynomial time. Two flavours: memoization (top-down cache) and tabulation (bottom-up table).",
    kv: ["Spot it|min / max / count / 'is it possible'"],
    badges: [{ text: "the big one", tone: "plain" }],
    lang: "python",
    code: `# Fibonacci: naive recursion is O(2^n); DP is O(n).
from functools import lru_cache

@lru_cache(maxsize=None)              # top-down memoization
def fib(n):
    return n if n < 2 else fib(n-1) + fib(n-2)

def fib_tab(n):                       # bottom-up, O(1) space
    a, b = 0, 1
    for _ in range(n): a, b = b, a + b
    return a

# 0/1 Knapsack — max value under a weight limit.  O(n·W)
def knapsack(wt, val, W):
    n = len(wt)
    dp = [[0]*(W+1) for _ in range(n+1)]
    for i in range(1, n+1):
        for w in range(W+1):
            dp[i][w] = dp[i-1][w]                    # skip
            if wt[i-1] <= w:                          # or take
                dp[i][w] = max(dp[i][w], val[i-1] + dp[i-1][w-wt[i-1]])
    return dp[n][W]`,
    note: "Other classics to know: coin change, longest common subsequence, longest increasing subsequence, edit distance, subset sum, matrix path sums.",
  },
  {
    id: "greedy", cat: "paradigms", name: "Greedy algorithms", tags: "activity selection huffman interval scheduling local optimal",
    idea: "Build the answer by always taking the best-looking choice right now, never reconsidering. Fast and simple — but only correct when local choices give a global optimum (you must be able to prove it).",
    kv: ["Usually|O(n log n)"],
    lang: "python",
    code: `# Activity selection: attend the most non-overlapping meetings.
def max_activities(intervals):        # [(start, end), ...]
    intervals.sort(key=lambda x: x[1])   # earliest finish first
    count, end = 0, float('-inf')
    for s, e in intervals:
        if s >= end:                  # no clash — take it
            count += 1; end = e
    return count`,
    good: "You can prove the greedy choice is safe (exchange argument) and need speed.",
    avoid: "Choices interact — e.g. 0/1 knapsack. Greedy fails there; use DP.",
    note: "Must-know greedy wins: interval scheduling, Huffman coding, Dijkstra, Kruskal & Prim (MST), fractional knapsack.",
  },
  {
    id: "backtracking", cat: "paradigms", name: "Backtracking", tags: "n queens permutations subsets sudoku prune constraint",
    idea: "Build candidates one choice at a time; the moment a partial choice can't work, UNDO it and try the next ('prune'). It's DFS over the space of solutions — the go-to for puzzles and 'generate all valid…' problems.",
    kv: ["Cost|exponential, but pruned"],
    badges: [{ text: "exponential, pruned", tone: "warn" }],
    lang: "python",
    code: `# All subsets (the power set) via backtracking.
def subsets(nums):
    res, path = [], []
    def dfs(i):
        if i == len(nums):
            res.append(path[:]); return
        dfs(i + 1)                    # skip nums[i]
        path.append(nums[i])          # take nums[i]
        dfs(i + 1)
        path.pop()                    # backtrack — undo
    dfs(0)
    return res`,
    note: "Signature problems: N-Queens, Sudoku, permutations/combinations, word search. The whole art is pruning — the earlier you detect a dead end, the faster it runs.",
  },
  /* Toolkit */
  {
    id: "hashing", cat: "toolkit", name: "Hashing & hash tables", tags: "hash map set collision o1 lookup two sum",
    idea: "A hash function maps a key to an array index, giving average O(1) insert, delete, and lookup. The dictionary / hash map / set you use daily — and the biggest 'cheat code' for turning O(n²) into O(n).",
    kv: ["Average|O(1)", "Worst|O(n)"],
    badges: [{ text: "O(1) average lookup", tone: "ok" }],
    lang: "python",
    code: `# Two-sum in O(n): remember what you've seen.
def two_sum(nums, target):
    seen = {}                         # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []`,
    note: "Interview reflex: 'find a pair / duplicate / count of…' ⇒ a hash set or map almost always removes a nested loop.",
  },
  {
    id: "strings", cat: "toolkit", name: "String matching (KMP · Rabin-Karp)", tags: "pattern search substring rolling hash lps",
    idea: "Naive pattern search is O(n·m). KMP precomputes a 'failure table' so it never re-checks matched characters — guaranteed O(n + m). Rabin-Karp hashes each sliding window (a rolling hash updates in O(1)) — great for multi-pattern search and plagiarism detection.",
    kv: ["Time|O(n + m)"],
    badges: [{ text: "O(n + m)", tone: "ok" }],
    note: "You rarely re-implement these in interviews, but recognise them by name and know they beat naive O(n·m). The rolling-hash idea powers many substring problems.",
  },
  {
    id: "math", cat: "toolkit", name: "Number-theory essentials", tags: "gcd euclid sieve primes fast exponentiation modular",
    idea: "A few tiny algorithms that show up everywhere: Euclid's GCD (repeated remainder, O(log n)), fast exponentiation by squaring (O(log n)), and the Sieve of Eratosthenes for all primes up to n (O(n log log n)).",
    kv: ["GCD|O(log n)", "Fast power|O(log n)", "Sieve|O(n log log n)"],
    lang: "python",
    code: `def gcd(a, b):
    while b: a, b = b, a % b
    return a

def power(a, n):                      # fast exponentiation
    result = 1
    while n:
        if n & 1: result *= a
        a *= a; n >>= 1
    return result

def primes_up_to(n):                  # Sieve of Eratosthenes
    ok = [True]*(n+1); ok[0]=ok[1]=False
    for p in range(2, int(n**0.5)+1):
        if ok[p]:
            for m in range(p*p, n+1, p): ok[m] = False
    return [i for i, v in enumerate(ok) if v]`,
  },
  {
    id: "patterns", cat: "toolkit", name: "Interview patterns", tags: "two pointers sliding window prefix sum binary search on answer stack heap top k",
    idea: "Beyond named algorithms, these reusable patterns crack a huge share of problems: two pointers, sliding window, prefix sums, binary-search-on-the-answer, stack for structure, and a size-k heap for top-K. Recognising the pattern is half the battle.",
    kv: ["Two pointers", "Sliding window", "Prefix sums", "Binary search on answer", "Monotonic stack", "Top-K heap"],
  },
];

/* Interview Q&A */
const QA: { q: string; a: string }[] = [
  { q: "Why is quicksort often faster than merge sort if both are O(n log n)?", a: "Quicksort sorts in place with great cache locality and small constants; merge sort needs O(n) extra memory and more data movement. Quicksort's risk is the O(n²) worst case, which random / median-of-three pivots make vanishingly unlikely." },
  { q: "When would you use BFS over DFS?", a: "BFS for shortest path / fewest steps in an unweighted graph and level-order work; DFS for path existence, cycle detection, connected components, topological sort, and backtracking. Both are O(V+E)." },
  { q: "What makes a problem solvable by dynamic programming?", a: "Optimal substructure (best answer built from best sub-answers) plus overlapping sub-problems (the same sub-problems recur). If sub-problems are independent, plain divide-and-conquer suffices; if greedy choices are provably safe, greedy is simpler." },
  { q: "Why can't Dijkstra handle negative edge weights?", a: "It finalises a node the moment it's popped as closest, assuming no cheaper route appears later. A negative edge can create one after finalisation. Use Bellman-Ford (O(V·E)) for negative edges — it also detects negative cycles." },
  { q: "Hash lookup is O(1) — what's the catch?", a: "It's O(1) on average. Worst case is O(n) if many keys collide. Good hash functions, load-factor resizing, and treeing long buckets keep it effectively constant in practice." },
  { q: "Greedy vs DP for the knapsack problem?", a: "Fractional knapsack (take part of an item) is greedy by value-per-weight. 0/1 knapsack (whole items) needs DP — greedy gives wrong answers because a high-ratio item can block a better combination." },
  { q: "What does a 'stable' sort mean and when does it matter?", a: "Equal elements keep their original relative order. It matters when sorting by multiple keys (sort by name, then stably by age → names stay ordered within each age). Merge and insertion sort are stable; quick and heap sort are not." },
];

const ROAD: { n: number; h: string; p: string }[] = [
  { n: 1, h: "Complexity first", p: "Get comfortable reading Big-O — you can't compare algorithms without it." },
  { n: 2, h: "Search & sort", p: "Binary search + merge/quick sort. Implement them from memory until automatic." },
  { n: 3, h: "Data structures", p: "Arrays, stacks, queues, hash maps, heaps, trees — algorithms live on these." },
  { n: 4, h: "Graphs", p: "BFS, DFS, then Dijkstra, topological sort, Union-Find. Draw them by hand." },
  { n: 5, h: "Paradigms", p: "Recursion → greedy → backtracking → DP, in that order of difficulty." },
  { n: 6, h: "Patterns & practice", p: "Two pointers, sliding window, top-K. Then grind 3–5 problems a week; review your misses." },
];

/* ─────────────────────────── small helpers ─────────────────────────── */

function CodeBlock({ code, lang = "python" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fm-algo-code">
      <span className="fm-algo-code-lang">{lang}</span>
      <button className="fm-algo-copy" onClick={() => {
        if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }).catch(() => {});
      }}>{copied ? "Copied ✓" : "Copy"}</button>
      <pre>{code}</pre>
    </div>
  );
}

function badgeCls(t?: Badge["tone"]) { return "fm-algo-badge" + (t && t !== "plain" ? " " + t : ""); }

function AlgoCard({ a }: { a: Algo }) {
  return (
    <article className="fm-algo-card">
      <h3 className="fm-algo-name">
        {a.name}
        {a.star && <span className="fm-algo-star" title="Interview-critical">★</span>}
        {(a.badges ?? []).map((b, i) => <span key={i} className={badgeCls(b.tone)}>{b.text}</span>)}
      </h3>
      <p className="fm-algo-idea">{a.idea}</p>
      {a.kv && (
        <div className="fm-algo-kv">
          {a.kv.map((t, i) => {
            const [k, v] = t.split("|");
            return <span key={i} className="fm-algo-chip2">{k}{v && <b> {v}</b>}</span>;
          })}
        </div>
      )}
      {a.code && <CodeBlock code={a.code} lang={a.lang} />}
      {(a.good || a.avoid) && (
        <div className="fm-algo-when">
          {a.good && <div className="good"><b>Use when</b> {a.good}</div>}
          {a.avoid && <div className="avoid"><b>Avoid when</b> {a.avoid}</div>}
        </div>
      )}
      {a.note && <p className="fm-algo-note">💡 {a.note}</p>}
    </article>
  );
}

/* ─────────────────────────── Big-O growth chart ─────────────────────────── */

function BigOChart() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [n, setN] = useState(32);
  const [on, setOn] = useState<boolean[]>([true, true, true, true, true, true]);
  const funcs = useMemo(() => [
    { name: "O(1)", f: () => 1, col: "#34d399" },
    { name: "O(log n)", f: (x: number) => Math.log2(x), col: "#22d3ee" },
    { name: "O(n)", f: (x: number) => x, col: "#4f7bff" },
    { name: "O(n log n)", f: (x: number) => x * Math.log2(x), col: "#a855f7" },
    { name: "O(n²)", f: (x: number) => x * x, col: "#fbbf24" },
    { name: "O(2ⁿ)", f: (x: number) => Math.pow(2, x), col: "#fb7185" },
  ], []);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const W = cv.width, H = cv.height, pad = 32;
    const css = getComputedStyle(document.documentElement);
    const gridCol = (css.getPropertyValue("--ink") || "#888").trim();
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(128,128,128,.14)"; ctx.lineWidth = 1;
    for (let g = 0; g <= 10; g++) { const x = pad + (W - 2 * pad) * g / 10; ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, H - pad); ctx.stroke(); }
    for (let g = 0; g <= 5; g++) { const y = pad + (H - 2 * pad) * g / 5; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke(); }
    let maxV = 1;
    funcs.forEach((fn, i) => { if (on[i]) { const v = fn.f(n); if (v > maxV) maxV = v; } });
    const logMax = Math.log10(maxV + 1);
    funcs.forEach((fn, i) => {
      if (!on[i]) return;
      ctx.strokeStyle = fn.col; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let s = 0; s <= 120; s++) {
        const nn = 1 + (n - 1) * s / 120;
        let v = fn.f(nn); if (v < 1) v = 1; if (v > maxV) v = maxV;
        const px = pad + (W - 2 * pad) * (nn - 1) / (n - 1);
        const py = (H - pad) - (H - 2 * pad) * (Math.log10(v + 1) / logMax);
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
    ctx.fillStyle = gridCol ? gridCol + "99" : "#8888"; ctx.font = '11px ui-monospace, monospace';
    ctx.globalAlpha = 0.6;
    ctx.fillText("steps (log scale) →", pad, pad - 12);
    ctx.fillText("input size n →", W - pad - 92, H - pad + 20);
    ctx.globalAlpha = 1;
  }, [n, on, funcs]);

  return (
    <div className="fm-algo-lab">
      <h4>📈 Live: watch the growth curves</h4>
      <p className="fm-algo-hint">Slide <code>n</code> and see how many steps each class needs. O(n²) and O(2ⁿ) explode while O(log n) barely moves.</p>
      <canvas ref={ref} width={820} height={280} className="fm-algo-canvas" />
      <div className="fm-algo-controls">
        <label className="fm-algo-stat">n = <b>{n}</b></label>
        <input type="range" min={2} max={64} value={n} onChange={(e) => setN(parseInt(e.target.value, 10))} style={{ flex: 1, minWidth: 160 }} />
      </div>
      <div className="fm-algo-controls">
        {funcs.map((fn, i) => (
          <button key={fn.name} className={"fm-fact-chip" + (on[i] ? " on" : "")} style={{ borderColor: fn.col }}
            onClick={() => setOn((p) => p.map((v, j) => j === i ? !v : v))}>{fn.name}</button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Binary-search stepper ─────────────────────────── */

const BS_ARR = [3, 8, 12, 17, 23, 29, 34, 41, 47, 52, 58, 63, 71, 79, 85, 92];

function BinaryLab() {
  const [target, setTarget] = useState(47);
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(BS_ARR.length - 1);
  const [mid, setMid] = useState(-1);
  const [done, setDone] = useState(false);
  const [found, setFound] = useState(-1);
  const [msg, setMsg] = useState("Ready — press Step.");

  function reset(t = target) {
    setLo(0); setHi(BS_ARR.length - 1); setMid(-1); setDone(false); setFound(-1);
    setMsg(`Searching for ${t} — press Step.`);
  }
  useEffect(() => { reset(target); /* eslint-disable-next-line */ }, [target]);

  function step() {
    if (done) return;
    if (lo > hi) { setDone(true); setMsg(`❌ ${target} not found (window empty).`); return; }
    const m = Math.floor((lo + hi) / 2); setMid(m);
    if (BS_ARR[m] === target) { setFound(m); setDone(true); setMsg(`✅ Found ${target} at index ${m}.`); }
    else if (BS_ARR[m] < target) { setMsg(`arr[mid]=${BS_ARR[m]} < ${target} → search RIGHT half.`); setLo(m + 1); }
    else { setMsg(`arr[mid]=${BS_ARR[m]} > ${target} → search LEFT half.`); setHi(m - 1); }
  }

  return (
    <div className="fm-algo-lab">
      <h4>🔎 Live: step through binary search</h4>
      <p className="fm-algo-hint">The array is sorted. Pick a target, then press Step to watch the window shrink. Blue = lo, purple = hi, amber = mid.</p>
      <div className="fm-algo-controls">
        <label className="fm-algo-stat">Target:</label>
        <select className="fm-algo-select" value={target} onChange={(e) => setTarget(parseInt(e.target.value, 10))}>
          {BS_ARR.map((v) => <option key={v} value={v}>{v}</option>)}
          <option value={40}>40 (absent)</option>
          <option value={100}>100 (absent)</option>
        </select>
        <button className="fm-algo-btn primary" onClick={step}>▶ Step</button>
        <button className="fm-algo-btn" onClick={() => reset()}>↻ Reset</button>
        <span className="fm-algo-stat">{msg}</span>
      </div>
      <div className="fm-bs-row">
        {BS_ARR.map((v, i) => {
          let cls = "fm-bs-cell";
          if (done) cls += i === found ? " found" : " out";
          else {
            if (i < lo || i > hi) cls += " out";
            if (i === lo) cls += " lo";
            if (i === hi) cls += " hi";
            if (i === mid) cls += " mid";
          }
          return <div key={i} className={cls}>{v}</div>;
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── Sorting visualizer ─────────────────────────── */

type Frame = { a: number[]; cmp: number[]; swp: number[]; done: number[]; c: number; s: number };

function recordFrames(algo: string, arr0: number[]): Frame[] {
  const a = arr0.slice(); const frames: Frame[] = []; const c = { n: 0 }, s = { n: 0 };
  const snap = (cmp: number[], swp: number[], done: number[]) => frames.push({ a: a.slice(), cmp, swp, done, c: c.n, s: s.n });
  const doneTail = (len: number, i: number) => { const d: number[] = []; for (let x = len - i; x < len; x++) d.push(x); return d; };
  const doneHead = (i: number) => { const d: number[] = []; for (let x = 0; x < i; x++) d.push(x); return d; };
  if (algo === "bubble") {
    for (let i = 0; i < a.length; i++) for (let j = 0; j < a.length - 1 - i; j++) {
      c.n++; snap([j, j + 1], [], doneTail(a.length, i));
      if (a[j] > a[j + 1]) { const t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; s.n++; snap([], [j, j + 1], doneTail(a.length, i)); }
    }
  } else if (algo === "insertion") {
    for (let i = 1; i < a.length; i++) { const key = a[i]; let j = i - 1; c.n++; snap([j, i], [], []); while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; s.n++; snap([], [j, j + 1], []); j--; if (j >= 0) { c.n++; snap([j, i], [], []); } } a[j + 1] = key; snap([], [j + 1], []); }
  } else if (algo === "selection") {
    for (let i = 0; i < a.length; i++) { let m = i; for (let j = i + 1; j < a.length; j++) { c.n++; snap([m, j], [], doneHead(i)); if (a[j] < a[m]) m = j; } if (m !== i) { const t = a[i]; a[i] = a[m]; a[m] = t; s.n++; snap([], [i, m], doneHead(i)); } }
  } else if (algo === "merge") {
    const ms = (l: number, r: number) => {
      if (l >= r) return; const mid = (l + r) >> 1; ms(l, mid); ms(mid + 1, r);
      const left = a.slice(l, mid + 1), right = a.slice(mid + 1, r + 1); let i = 0, j = 0, k = l;
      while (i < left.length && j < right.length) { c.n++; snap([k], [], []); if (left[i] <= right[j]) { a[k] = left[i]; i++; } else { a[k] = right[j]; j++; } s.n++; snap([], [k], []); k++; }
      while (i < left.length) { a[k] = left[i]; i++; s.n++; snap([], [k], []); k++; }
      while (j < right.length) { a[k] = right[j]; j++; s.n++; snap([], [k], []); k++; }
    };
    ms(0, a.length - 1);
  } else if (algo === "quick") {
    const qs = (lo: number, hi: number) => {
      if (lo >= hi) return; const pivot = a[hi]; let i = lo - 1;
      for (let j = lo; j < hi; j++) { c.n++; snap([j, hi], [], []); if (a[j] <= pivot) { i++; const t = a[i]; a[i] = a[j]; a[j] = t; s.n++; snap([], [i, j], []); } }
      const t2 = a[i + 1]; a[i + 1] = a[hi]; a[hi] = t2; s.n++; snap([], [i + 1, hi], []); qs(lo, i); qs(i + 2, hi);
    };
    qs(0, a.length - 1);
  }
  const allDone: number[] = []; for (let k = 0; k < a.length; k++) allDone.push(k);
  frames.push({ a: a.slice(), cmp: [], swp: [], done: allDone, c: c.n, s: s.n });
  return frames;
}

function SortingLab() {
  const [algo, setAlgo] = useState("bubble");
  const [size, setSize] = useState(40);
  const [speed, setSpeed] = useState(55);
  const [arr, setArr] = useState<number[]>([]);
  const [meta, setMeta] = useState<{ cmp: number[]; swp: number[]; done: number[] }>({ cmp: [], swp: [], done: [] });
  const [stats, setStats] = useState({ c: 0, s: 0 });
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);
  const stateRef = useRef({ algo, size, speed });
  stateRef.current = { algo, size, speed };

  const newArray = () => {
    const n = stateRef.current.size; const a: number[] = [];
    for (let i = 0; i < n; i++) a.push(Math.floor(Math.random() * 95) + 5);
    setArr(a); setMeta({ cmp: [], swp: [], done: [] }); setStats({ c: 0, s: 0 });
  };
  useEffect(() => { newArray(); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const stop = () => { setPlaying(false); if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const play = () => {
    if (playing) { stop(); return; }
    const frames = recordFrames(stateRef.current.algo, arr);
    setPlaying(true); let idx = 0;
    const tick = () => {
      if (idx >= frames.length) { stop(); return; }
      const f = frames[idx++]; setArr(f.a.slice()); setMeta({ cmp: f.cmp, swp: f.swp, done: f.done }); setStats({ c: f.c, s: f.s });
      const delay = Math.max(4, 210 - stateRef.current.speed * 2);
      timer.current = window.setTimeout(tick, delay);
    };
    tick();
  };

  return (
    <div className="fm-algo-lab">
      <h4>📊 Live: sorting visualizer</h4>
      <p className="fm-algo-hint">Pick an algorithm and press Sort. Amber = comparing, red = swapping, green = locked in place.</p>
      <div className="fm-algo-controls">
        {[["bubble", "Bubble"], ["insertion", "Insertion"], ["selection", "Selection"], ["merge", "Merge"], ["quick", "Quick"]].map(([id, lbl]) => (
          <button key={id} className={"fm-fact-chip" + (algo === id ? " on" : "")} onClick={() => { stop(); setAlgo(id); }}>{lbl}</button>
        ))}
      </div>
      <div className="fm-algo-bars">
        {arr.map((v, i) => {
          let cls = "fm-algo-bar";
          if (meta.done.includes(i)) cls += " done";
          else if (meta.swp.includes(i)) cls += " swp";
          else if (meta.cmp.includes(i)) cls += " cmp";
          return <div key={i} className={cls} style={{ height: v + "%" }} />;
        })}
      </div>
      <div className="fm-algo-controls">
        <button className="fm-algo-btn primary" onClick={play}>{playing ? "⏸ Pause" : "▶ Sort"}</button>
        <button className="fm-algo-btn" onClick={() => { stop(); newArray(); }}>🔀 Shuffle</button>
        <label className="fm-algo-stat">Speed</label><input type="range" min={1} max={100} value={speed} onChange={(e) => setSpeed(parseInt(e.target.value, 10))} />
        <label className="fm-algo-stat">Size</label><input type="range" min={12} max={80} value={size} onChange={(e) => { stop(); setSize(parseInt(e.target.value, 10)); setTimeout(newArray, 0); }} />
        <span className="fm-algo-stat">compares <b>{stats.c}</b> · swaps <b>{stats.s}</b></span>
      </div>
    </div>
  );
}

/* ─────────────────────────── main screen ─────────────────────────── */

export function Algorithms() {
  const [cat, setCat] = useState<CatId | "all">("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const show = (c: CatId) => cat === "all" || cat === c;
  const cardsIn = (c: CatId) => ALGOS.filter((a) => a.cat === c && (!q || (a.name + " " + a.tags + " " + a.idea).toLowerCase().includes(q)));

  const anyFound = ALGOS.some((a) => !q || (a.name + " " + a.tags + " " + a.idea).toLowerCase().includes(q))
    || (!q && (show("interview") || show("roadmap")));

  return (
    <div className="fm-algo">
      <header className="fm-algo-head">
        <h1>🧠 Algorithms Every Student Must Know</h1>
        <p className="fm-dash-sub">A CS &amp; interview study guide — searching, sorting, graphs, dynamic programming and more, with live visualizers and clean code. ★ = interview-critical.</p>
      </header>

      <div className="fm-algo-cats">
        <button className={"fm-fact-chip" + (cat === "all" ? " on" : "")} onClick={() => setCat("all")}>✨ All</button>
        {CATS.map((c) => (
          <button key={c.id} className={"fm-fact-chip" + (cat === c.id ? " on" : "")} onClick={() => setCat(c.id)}>{c.icon} {c.label}</button>
        ))}
      </div>

      <div className="fm-search-wrap fm-algo-search">
        <span className="fm-search-ic">🔍</span>
        <input className="fm-search-input" value={query} placeholder="Search algorithms — try 'binary', 'graph', 'dynamic'…" onChange={(e) => setQuery(e.target.value)} aria-label="Search algorithms" />
        {query && <button className="fm-search-clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>}
      </div>

      {/* Foundations */}
      {show("foundations") && !q && (
        <section className="fm-algo-sec">
          <h2 className="fm-algo-cat-title">🧭 Foundations</h2>
          <div className="fm-algo-card">
            <h3 className="fm-algo-name">What is an algorithm?</h3>
            <p className="fm-algo-idea">A finite, unambiguous, step-by-step procedure that turns an input into a correct output — a recipe a computer follows with zero guessing. Ask three things about any algorithm: <b>Is it correct</b> for every input (including empty / single / duplicate cases)? <b>How fast</b> does it grow with n (time complexity)? <b>How much memory</b> beyond the input (space complexity)? Great engineers memorise <b>ideas and trade-offs</b>, not code.</p>
          </div>
          <div className="fm-algo-card">
            <h3 className="fm-algo-name">Big-O &amp; complexity <span className="fm-algo-badge">the language of speed</span></h3>
            <p className="fm-algo-idea">Big-O describes how an algorithm's cost <b>grows</b> as input size n grows, ignoring constants. It answers "will this still work when n is a million?"</p>
            <BigOChart />
            <div className="fm-algo-tablewrap">
              <table className="fm-algo-table">
                <thead><tr><th>Notation</th><th>Name</th><th>Feels like</th><th>Example</th></tr></thead>
                <tbody>
                  <tr><td className="mono ok">O(1)</td><td>Constant</td><td>Instant, any size</td><td>Array index, hash lookup</td></tr>
                  <tr><td className="mono ok">O(log n)</td><td>Logarithmic</td><td>Halves each step</td><td>Binary search</td></tr>
                  <tr><td className="mono ok">O(n)</td><td>Linear</td><td>One pass</td><td>Linear search, BFS/DFS</td></tr>
                  <tr><td className="mono warn">O(n log n)</td><td>Linearithmic</td><td>Best for sorting</td><td>Merge, heap sort</td></tr>
                  <tr><td className="mono warn">O(n²)</td><td>Quadratic</td><td>Nested loops</td><td>Bubble sort, naive pairs</td></tr>
                  <tr><td className="mono bad">O(2ⁿ)</td><td>Exponential</td><td>Doubles each add</td><td>Naive recursion, subsets</td></tr>
                  <tr><td className="mono bad">O(n!)</td><td>Factorial</td><td>Brute-force order</td><td>Permutations, naive TSP</td></tr>
                </tbody>
              </table>
            </div>
            <p className="fm-algo-note">🎯 Rule of thumb: for n up to ~10⁸ you want O(n) or O(n log n). O(n²) is fine to ~10⁴. O(2ⁿ) only for tiny n (~20). Always state best / average / worst — quicksort is O(n log n) average but O(n²) worst.</p>
          </div>
        </section>
      )}

      {/* Searching */}
      {show("searching") && (
        <section className="fm-algo-sec">
          <h2 className="fm-algo-cat-title">🔎 Searching</h2>
          {!q && <BinaryLab />}
          {cardsIn("searching").map((a) => <AlgoCard key={a.id} a={a} />)}
        </section>
      )}

      {/* Sorting */}
      {show("sorting") && (
        <section className="fm-algo-sec">
          <h2 className="fm-algo-cat-title">📊 Sorting</h2>
          {!q && <SortingLab />}
          {cardsIn("sorting").map((a) => <AlgoCard key={a.id} a={a} />)}
          {!q && (
            <div className="fm-algo-card">
              <h3 className="fm-algo-name">Sorting cheat-sheet</h3>
              <div className="fm-algo-tablewrap">
                <table className="fm-algo-table">
                  <thead><tr><th>Algorithm</th><th className="mono">Best</th><th className="mono">Avg</th><th className="mono">Worst</th><th className="mono">Space</th><th>Stable</th></tr></thead>
                  <tbody>
                    <tr><td>Bubble</td><td className="mono ok">n</td><td className="mono bad">n²</td><td className="mono bad">n²</td><td className="mono ok">1</td><td className="ok">✔</td></tr>
                    <tr><td>Selection</td><td className="mono bad">n²</td><td className="mono bad">n²</td><td className="mono bad">n²</td><td className="mono ok">1</td><td className="bad">✗</td></tr>
                    <tr><td>Insertion</td><td className="mono ok">n</td><td className="mono bad">n²</td><td className="mono bad">n²</td><td className="mono ok">1</td><td className="ok">✔</td></tr>
                    <tr><td>Merge</td><td className="mono warn">n log n</td><td className="mono warn">n log n</td><td className="mono warn">n log n</td><td className="mono bad">n</td><td className="ok">✔</td></tr>
                    <tr><td>Quick</td><td className="mono warn">n log n</td><td className="mono warn">n log n</td><td className="mono bad">n²</td><td className="mono ok">log n</td><td className="bad">✗</td></tr>
                    <tr><td>Heap</td><td className="mono warn">n log n</td><td className="mono warn">n log n</td><td className="mono warn">n log n</td><td className="mono ok">1</td><td className="bad">✗</td></tr>
                    <tr><td>Counting / Radix</td><td className="mono ok">n+k</td><td className="mono ok">n+k</td><td className="mono ok">n+k</td><td className="mono warn">n+k</td><td className="ok">✔</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="fm-algo-note">🧠 <b>Stable</b> = equal elements keep their order (matters for multi-key sorts). Counting/Radix aren't comparison sorts, so they beat the O(n log n) lower bound — but only for integers in a bounded range.</p>
            </div>
          )}
        </section>
      )}

      {/* Graphs */}
      {show("graphs") && (
        <section className="fm-algo-sec">
          <h2 className="fm-algo-cat-title">🕸️ Graphs</h2>
          {cardsIn("graphs").map((a) => <AlgoCard key={a.id} a={a} />)}
        </section>
      )}

      {/* Paradigms */}
      {show("paradigms") && (
        <section className="fm-algo-sec">
          <h2 className="fm-algo-cat-title">🧩 Paradigms</h2>
          {cardsIn("paradigms").map((a) => <AlgoCard key={a.id} a={a} />)}
        </section>
      )}

      {/* Toolkit */}
      {show("toolkit") && (
        <section className="fm-algo-sec">
          <h2 className="fm-algo-cat-title">🧰 Toolkit</h2>
          {cardsIn("toolkit").map((a) => <AlgoCard key={a.id} a={a} />)}
        </section>
      )}

      {/* Interview */}
      {show("interview") && !q && (
        <section className="fm-algo-sec">
          <h2 className="fm-algo-cat-title">🎤 Interview Q&amp;A</h2>
          <div className="fm-algo-qa">
            {QA.map((item, i) => (
              <details key={i}><summary>{item.q}</summary><div className="a">{item.a}</div></details>
            ))}
          </div>
        </section>
      )}

      {/* Roadmap */}
      {show("roadmap") && !q && (
        <section className="fm-algo-sec">
          <h2 className="fm-algo-cat-title">🗺️ A study roadmap that works</h2>
          <div className="fm-algo-road">
            {ROAD.map((s) => (
              <div key={s.n} className="fm-algo-step"><div className="n">{s.n}</div><h4>{s.h}</h4><p>{s.p}</p></div>
            ))}
          </div>
          <p className="fm-algo-note">🚀 The meta-skill: after each problem ask "what pattern was this, and what's the next-level version?" Pattern recognition — not memorised code — makes algorithms feel easy.</p>
        </section>
      )}

      {!anyFound && <p className="fm-search-count">No algorithms match "{query}". Try another word.</p>}
    </div>
  );
}
