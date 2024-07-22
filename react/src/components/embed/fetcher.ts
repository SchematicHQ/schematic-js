import { parseEditorState, type SerializedNodeWithChildren } from "./parser";
import testData from "./assets/json/test-data.json";

export async function fetchComponent(id: string, accessToken: string) {
  const apiUrl = "https://api.schematichq.com";
  const parsedEditorState = parseEditorState(testData.editorState);

  return new Promise<{
    editorState: SerializedNodeWithChildren[];
    componentProps: Record<string, object | undefined>;
  }>((resolve) => {
    fetch(`${apiUrl}/components/${id}/hydrate`, {
      headers: {
        "X-Schematic-Api-Key": accessToken,
      },
    })
      .then((response) => {
        console.log(response);
        resolve({
          editorState: parsedEditorState,
          componentProps: testData.componentProps,
        });
      })
      .catch((r) => {
        console.log("OH NO!", r);
      });
  });
}
