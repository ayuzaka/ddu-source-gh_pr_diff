# ddu-source-gh_pr_diff

A ddu.vim source that lists files changed in the current GitHub Pull Request.

## Requirements

- [denops.vim](https://github.com/vim-denops/denops.vim)
- [ddu.vim](https://github.com/Shougo/ddu.vim)
- [ddu-ui-ff](https://github.com/Shougo/ddu-ui-ff) or other ddu UI
- [gh CLI](https://cli.github.com/) (authenticated with `gh auth login`)

## Configuration

```lua
vim.fn["ddu#custom#patch_global"]({
  kindOptions = {
    gh_pr_diff = {
      defaultAction = "diff",
    },
  },
})
```

```vim
call ddu#custom#patch_global(#{
  \   kindOptions: #{
  \     gh_pr_diff: #{
  \       defaultAction: 'diff',
  \     },
  \   },
  \ })
```

## Actions

| Action | Description |
|--------|-------------|
| `diff` | Show diff between working tree and base branch using Vim's diff mode |
| `open` | Open the file in current window |
