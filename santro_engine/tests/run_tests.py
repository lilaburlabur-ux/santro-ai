"""Zero-dependency test runner (used when pytest is absent).
    python -m santro_engine.tests.run_tests
Collects every top-level `test_*` function in the test modules, runs it,
reports pass/fail. Exit code = number of failures."""
import importlib
import traceback

MODULES = ["santro_engine.tests.test_ticker_resolver",
           "santro_engine.tests.test_research_packet"]


def main() -> int:
    passed = failed = 0
    for modname in MODULES:
        mod = importlib.import_module(modname)
        for name in sorted(dir(mod)):
            if not name.startswith("test_"):
                continue
            fn = getattr(mod, name)
            if not callable(fn):
                continue
            try:
                fn()
                passed += 1
                print(f"PASS  {modname.split('.')[-1]}::{name}")
            except Exception as e:  # noqa: BLE001 — test harness
                failed += 1
                print(f"FAIL  {modname.split('.')[-1]}::{name} — {e}")
                traceback.print_exc()
    print(f"\n{passed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    raise SystemExit(main())
