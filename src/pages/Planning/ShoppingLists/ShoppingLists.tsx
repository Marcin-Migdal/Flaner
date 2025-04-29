import { Col, Row, SidePanel, useSidePanel } from "@marcin-migdal/m-component-library";
import { useState } from "react";

import { useGetShoppingListQuery } from "../../../app/services/ShoppingLists";
import { selectAuthorization } from "../../../app/slices";
import { useAppSelector, useBreakpoint } from "../../../hooks";
import { ShoppingListPanel } from "./components/ShoppingListPanel/ShoppingListPanel";
import { ShoppingListProductsPanel } from "./components/ShoppingListProductPanel/ShoppingListProductPanel";

import "./styles.scss";

const ShoppingLists = () => {
  const { authUser } = useAppSelector(selectAuthorization);
  const [handleOpenSidePanel, sidePanelProps] = useSidePanel();
  const isMobile = useBreakpoint(`(max-width: 768px)`);

  const [selectedShoppingListId, setSelectedShoppingListId] = useState<string | null>(null);

  const shoppingListsQuery = useGetShoppingListQuery({
    currentUserUid: authUser?.uid,
  });

  const selectShoppingList = (shoppingListId: string | null) => {
    setSelectedShoppingListId(shoppingListId);
  };

  return (
    <div className="page p-4-rem">
      <Row className="content-container transparent m-auto g-4-rem">
        {!isMobile ? (
          <Col smFlex={4} className="panel flex flex-column">
            <ShoppingListPanel shoppingListsQuery={shoppingListsQuery} onShoppingListSelect={selectShoppingList} />
          </Col>
        ) : (
          <SidePanel {...sidePanelProps} position="right">
            <ShoppingListPanel shoppingListsQuery={shoppingListsQuery} onShoppingListSelect={selectShoppingList} />
          </SidePanel>
        )}
        <Col smFlex={8} className="panel flex flex-column pr-1-rem">
          <ShoppingListProductsPanel
            disableShoppingListsPanel={!shoppingListsQuery.isSuccess}
            selectedShoppingListId={selectedShoppingListId}
            handleOpenSidePanel={handleOpenSidePanel}
          />
        </Col>
      </Row>
    </div>
  );
};

export default ShoppingLists;
