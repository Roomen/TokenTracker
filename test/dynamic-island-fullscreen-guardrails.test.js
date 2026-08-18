const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const controllerSource = fs.readFileSync(
  path.join(
    __dirname,
    "../TokenTrackerBar/TokenTrackerBar/Services/DynamicIslandController.swift",
  ),
  "utf8",
);

const policySource = fs.readFileSync(
  path.join(
    __dirname,
    "../TokenTrackerBar/TokenTrackerBar/Models/DynamicIslandLayoutPolicy.swift",
  ),
  "utf8",
);

test("the island leaves another app's full-screen Space instead of overlaying it", () => {
  const behaviorMatch = controllerSource.match(
    /panel\.collectionBehavior\s*=\s*\[([^\]]+)\]/,
  );
  assert.ok(behaviorMatch, "island panel must set an explicit collectionBehavior");
  assert.match(behaviorMatch[1], /\.canJoinAllSpaces\b/);
  assert.doesNotMatch(
    behaviorMatch[1],
    /\.fullScreenAuxiliary\b/,
    "fullScreenAuxiliary would keep the island on top of native full-screen Spaces",
  );
});

test("island presence is gated on a testable full-screen policy", () => {
  assert.match(
    policySource,
    /enum\s+DynamicIslandFullscreenPolicy/,
    "full-screen decisions must live in a pure policy, not only AppKit glue",
  );
  assert.match(
    policySource,
    /static\s+func\s+shouldShowPanel\(featureEnabled:\s*Bool,\s*fullscreenActive:\s*Bool\)/,
  );
  assert.match(
    controllerSource,
    /DynamicIslandFullscreenPolicy\.shouldShowPanel\(/,
    "the controller must consult the policy before showing the panel",
  );
  assert.match(
    controllerSource,
    /NSWorkspace\.activeSpaceDidChangeNotification/,
    "space changes (native full-screen enter/exit) must refresh presence",
  );
  assert.match(
    controllerSource,
    /NSWorkspace\.didActivateApplicationNotification/,
    "app switches must refresh presence so a newly focused full-screen app hides the island",
  );
  assert.match(
    controllerSource,
    /NSApp\.observe\(\s*\\\.currentSystemPresentationOptions/,
    "same-space full-screen changes presentation options without a Space or app switch",
  );
  assert.match(
    controllerSource,
    /func setEnabled\([\s\S]*?fullscreenActive = readFullscreenActive\(\)[\s\S]*?applyPresence\(\)/,
    "enabling the island must re-read full-screen state so it does not appear over an already full-screen app",
  );
  assert.match(
    controllerSource,
    /CGRectMakeWithDictionaryRepresentation/,
    "window bounds must come from the CFDictionary helper; a [String: CGFloat] cast drops real window lists",
  );
});
