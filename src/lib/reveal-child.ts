export function revealChild(delay = 0) {
  return {
    "data-reveal-child": "",
    style: { transitionDelay: `${delay}ms` },
  };
}
