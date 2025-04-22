import {
  Accordion,
  DropdownMenu,
  Icon,
  SectionState,
  Textfield,
  TextFieldChangeEvent,
  useAlert,
} from "@marcin-migdal/m-component-library";
import { useState } from "react";

import { ContentWrapper, DeleteAlert, UseQueryResult } from "@components/index";
import { useAppSelector } from "@hooks/redux-hooks";
import { ShoppingList, useDeleteShoppingListMutation } from "@services/ShoppingLists";
import { selectAuthorization } from "@slices/authorization-slice";
import { AddShoppingListAlert } from "../AddShoppingListAlert/AddShoppingListAlert";
import { EditShoppingListAlert } from "../EditShoppingListAlert/EditShoppingListAlert";

import { OnDeleteMutation } from "@components/alerts/DeleteAlert";
import "./styles.scss";

const filterShoppingList = (shoppingList: ShoppingList[] | undefined, shoppingListFilter: string): ShoppingList[] => {
  if (!shoppingList) {
    return [];
  }

  if (shoppingListFilter.trim().length > 0) {
    return shoppingList.filter((shoppingList) =>
      shoppingList.name.toLocaleLowerCase().includes(shoppingListFilter.toLocaleLowerCase())
    );
  } else {
    return shoppingList;
  }
};

type ShoppingListPanelProps = {
  shoppingListsQuery: UseQueryResult<ShoppingList[]>;
  onShoppingListSelect: (shoppingListId: SectionState) => void;
};

export const ShoppingListPanel = ({ shoppingListsQuery, onShoppingListSelect }: ShoppingListPanelProps) => {
  const { authUser } = useAppSelector(selectAuthorization);

  const [handleOpenDeleteAlert, deleteAlertProps] = useAlert<string>();
  const [handleOpenEditAlert, editAlertProps] = useAlert<ShoppingList>();

  const [shoppingListsFilter, setShoppingListsFilter] = useState("");

  const [deleteShoppingList] = useDeleteShoppingListMutation();

  const handleFilterChange = (event: TextFieldChangeEvent) => {
    setShoppingListsFilter(event.target.value);
  };

  const handleDelete = (): OnDeleteMutation => {
    if (!deleteAlertProps.data) {
      return;
    }

    return deleteShoppingList(deleteAlertProps.data);
  };

  return (
    <>
      <div className="flex g-2-rem">
        <Textfield placeholder="Shopping list" onChange={handleFilterChange} />
        <AddShoppingListAlert />
      </div>
      <ContentWrapper query={shoppingListsQuery}>
        {({ data: shoppingLists }) => (
          <>
            <Accordion selectionMode="single" onSelect={onShoppingListSelect}>
              {filterShoppingList(shoppingLists, shoppingListsFilter).map((shoppingList) => (
                <Accordion.Section sectionId={shoppingList.id} key={shoppingList.id}>
                  <Accordion.Toggle className="p-2-rem">
                    <span>{shoppingList.name}</span>
                    <DropdownMenu
                      triggerContainerClassName="shopping-list-context-menu-trigger"
                      options={[
                        {
                          label: "Edit shopping list",
                          onClick: () => handleOpenEditAlert(shoppingList),
                          disabled: !authUser?.uid || !shoppingList.editAccess.includes(authUser.uid),
                        },
                        {
                          label: "Delete shopping list",
                          onClick: () => handleOpenDeleteAlert(shoppingList.id),
                          disabled: shoppingList.ownerId !== authUser?.uid,
                        },
                      ]}
                      openEvent="click"
                      openPosition="auto-bottom"
                      centerConsumer
                      hideDisabledOptions
                      hideOnDisabledOptions
                    >
                      <Icon icon="ellipsis-vertical" />
                    </DropdownMenu>
                  </Accordion.Toggle>
                </Accordion.Section>
              ))}
            </Accordion>
            <DeleteAlert onDelete={handleDelete} {...deleteAlertProps} entity="Shopping list" />
            <EditShoppingListAlert {...editAlertProps} />
          </>
        )}
      </ContentWrapper>
    </>
  );
};
