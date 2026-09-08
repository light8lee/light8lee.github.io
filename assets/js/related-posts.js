(function (root, factory) {
  var api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.RelatedPosts = api;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";

  function normalized(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
      .trim();
  }

  function titleTokens(title) {
    var text = normalized(title);
    var tokens = new Set(
      (text.match(/[a-z0-9][a-z0-9-]*/g) || []).filter(function (token) {
        return token.length > 1;
      })
    );
    var han = text.match(/[\u3400-\u9fff]/g) || [];

    for (var index = 0; index < han.length - 1; index += 1) {
      tokens.add(han[index] + han[index + 1]);
    }

    return tokens;
  }

  function findRelatedPosts(current, candidates, limit) {
    var currentTags = new Set((current.tags || []).map(normalized));
    var currentTokens = titleTokens(current.title);

    return candidates
      .filter(function (candidate) {
        return (
          candidate &&
          candidate.url &&
          candidate.url !== current.url &&
          candidate.published !== false
        );
      })
      .map(function (candidate) {
        var sharedTags = (candidate.tags || []).filter(function (tag) {
          return currentTags.has(normalized(tag));
        });
        var titleScore = Array.from(titleTokens(candidate.title))
          .filter(function (token) {
            return currentTokens.has(token);
          })
          .slice(0, 4).length;

        return Object.assign({}, candidate, {
          score: sharedTags.length * 8 + titleScore,
          sharedTags: sharedTags
        });
      })
      .filter(function (candidate) {
        return candidate.score > 0;
      })
      .sort(function (left, right) {
        return (
          right.score - left.score ||
          String(right.date || "").localeCompare(String(left.date || "")) ||
          left.title.localeCompare(right.title, "zh-CN")
        );
      })
      .slice(0, limit || 5);
  }

  function parseJson(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function renderRelatedPosts() {
    var panel = document.querySelector("[data-related-posts]");
    var data = document.querySelector("[data-related-posts-data]");

    if (!panel || !data) {
      return;
    }

    var candidates = parseJson(data.textContent);
    var currentTags = parseJson(panel.dataset.currentTags);
    var list = panel.querySelector("[data-related-posts-list]");

    if (!Array.isArray(candidates) || !Array.isArray(currentTags) || !list) {
      return;
    }

    var related = findRelatedPosts(
      {
        title: panel.dataset.currentTitle,
        url: panel.dataset.currentUrl,
        tags: currentTags
      },
      candidates
    );

    if (!related.length) {
      return;
    }

    related.forEach(function (item) {
      var link = document.createElement("a");
      link.className = "related-posts-link";
      link.href = item.url;
      link.textContent = item.title;

      if (item.sharedTags.length) {
        var tags = document.createElement("span");
        tags.className = "related-posts-tags";
        tags.textContent = item.sharedTags.join(" · ");
        link.prepend(tags);
      }

      list.appendChild(link);
    });

    panel.hidden = false;
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", renderRelatedPosts);
  }

  return {
    findRelatedPosts: findRelatedPosts,
    normalized: normalized,
    titleTokens: titleTokens
  };
});
