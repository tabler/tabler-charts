# Changesets

Every change that users of the packages should know about comes with a changeset: a short Markdown file in this directory that names the packages it touches, how much they should bump (`patch`, `minor`, `major`) and what changed, in a sentence or two. Write it with the change, in the same pull request:

```bash
pnpm changeset
```

The five packages are released together at one version, so a changeset usually lists all of them with the same bump. At release time the changesets are turned into the changelog entries and release notes of that version. More in the [Changesets documentation](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md).
