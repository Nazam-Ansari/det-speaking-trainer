import type { InteractiveNode, InteractiveScenario } from '../types';

/**
 * Walks a branching Interactive Speaking scenario.
 *
 * The next question is chosen with simple keyword rules defined in the question bank
 * (e.g. if the previous answer contains "online", ask a follow-up about studying online).
 * This is a rule-based question bank, not an AI conversation partner.
 */
export class InteractiveConversation {
  readonly scenario: InteractiveScenario;
  readonly length: number;
  private nodes: Map<string, InteractiveNode>;
  private asked: InteractiveNode[] = [];
  private current: InteractiveNode | null;

  constructor(scenario: InteractiveScenario, length = scenario.length) {
    this.scenario = scenario;
    this.length = Math.max(1, length);
    this.nodes = new Map(scenario.nodes.map((n) => [n.id, n]));
    this.current = this.nodes.get(scenario.start) ?? scenario.nodes[0] ?? null;
  }

  get currentNode(): InteractiveNode | null {
    return this.current;
  }

  get index(): number {
    return this.asked.length;
  }

  get finished(): boolean {
    return this.current === null || this.asked.length >= this.length;
  }

  /** Records the answer to the current node and moves to the next one. Returns the next node or null. */
  answer(transcript: string): InteractiveNode | null {
    if (!this.current) return null;
    this.asked.push(this.current);
    if (this.asked.length >= this.length) {
      this.current = null;
      return null;
    }
    this.current = this.resolveNext(this.current, transcript);
    return this.current;
  }

  private resolveNext(node: InteractiveNode, transcript: string): InteractiveNode | null {
    const text = ` ${transcript.toLowerCase().replace(/[^a-z' ]+/g, ' ')} `;
    const askedIds = new Set(this.asked.map((n) => n.id));
    for (const b of node.branches ?? []) {
      if (b.ifAny.some((k) => text.includes(` ${k.toLowerCase()} `)) && this.nodes.has(b.next)) {
        return this.nodes.get(b.next)!;
      }
    }
    if (node.next && this.nodes.has(node.next)) return this.nodes.get(node.next)!;
    // Dead end before reaching the requested length: continue with any unasked node.
    return this.scenario.nodes.find((n) => !askedIds.has(n.id) && n.id !== node.id) ?? null;
  }
}
