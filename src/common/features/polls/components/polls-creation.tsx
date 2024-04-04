import React, { useMemo } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@ui/modal";
import { _t } from "../../../i18n";
import { usePollsCreationManagement } from "../hooks";
import { FormControl, InputGroup } from "@ui/input";
import {
  UilCalender,
  UilPanelAdd,
  UilPlus,
  UilQuestionCircle,
  UilSave,
  UilTrash
} from "@iconscout/react-unicons";
import { Button } from "@ui/button";
import { format } from "date-fns";

export interface PollSnapshot {
  title: string;
  choices: string[];
  filters: {
    accountAge: number;
  };
  endTime: Date;
}

interface Props {
  show: boolean;
  setShow: (v: boolean) => void;
  onAdd: (poll: PollSnapshot) => void;
  existingPoll?: PollSnapshot;
  onDeletePoll: () => void;
}

export function PollsCreation({ show, setShow, onAdd, existingPoll, onDeletePoll }: Props) {
  const {
    title,
    setTitle,
    choices,
    pushChoice,
    deleteChoiceByIndex,
    updateChoiceByIndex,
    hasEmptyOrDuplicatedChoices,
    accountAge,
    setAccountAge,
    endDate,
    setEndDate
  } = usePollsCreationManagement(existingPoll);

  const formatDate = useMemo(() => format(endDate ?? new Date(), "yyyy-MM-dd"), [endDate]);

  return (
    <Modal
      show={show}
      centered={true}
      onHide={() => setShow(false)}
      className="polls-creation-modal"
    >
      <ModalHeader closeButton={true}>
        <ModalTitle>{_t(existingPoll ? "polls.edit-title" : "polls.title")}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-6">
          <InputGroup prepend={<UilQuestionCircle />}>
            <FormControl
              placeholder={_t("polls.title-placeholder")}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </InputGroup>
          <InputGroup prepend={<UilCalender />}>
            <FormControl
              placeholder={_t("polls.title-placeholder")}
              type="date"
              value={formatDate}
              onChange={(e: any) => setEndDate(new Date(e.target.value))}
            />
          </InputGroup>

          <div className="flex flex-col gap-4 items-start mb-6">
            <div>{_t("polls.choices")}</div>
            {choices?.map((choice, key) => (
              <div key={key} className="w-full flex items-center gap-4">
                <InputGroup prepend={key + 1}>
                  <FormControl
                    placeholder={_t("polls.choice-placeholder", { n: key + 1 })}
                    type="text"
                    value={choice}
                    onChange={(e) => updateChoiceByIndex(e.target.value, key)}
                  />
                </InputGroup>
                <Button
                  size="sm"
                  onClick={() => deleteChoiceByIndex(key)}
                  appearance="gray-link"
                  icon={<UilTrash />}
                />
              </div>
            ))}
          </div>
          {hasEmptyOrDuplicatedChoices && (
            <div className="text-sm opacity-75 text-center pb-4">{_t("polls.polls-form-hint")}</div>
          )}
        </div>
        <div className="flex flex-col gap-4 items-start">
          <div>{_t("polls.options")}</div>
          <div className="text-sm opacity-50">{_t("polls.account-age")}</div>
          <FormControl
            placeholder="100"
            type="number"
            min={0}
            max={200}
            value={accountAge}
            onChange={(e) => {
              const value = +e.target.value;
              if (value >= 0 && value <= 200) {
                setAccountAge(+e.target.value);
              } else if (value < 0) {
                setAccountAge(0);
              } else {
                setAccountAge(200);
              }
            }}
          />
        </div>
      </ModalBody>
      <ModalFooter sticky={true}>
        <div className="flex justify-between">
          <Button
            icon={<UilPlus />}
            iconPlacement="left"
            onClick={() => pushChoice("")}
            outline={true}
          >
            {_t("polls.add-choice")}
          </Button>
          <div className="flex gap-2">
            {existingPoll && (
              <Button
                appearance="danger"
                icon={<UilTrash />}
                iconPlacement="left"
                onClick={() => {
                  onDeletePoll();
                  setShow(false);
                }}
                outline={true}
              >
                {_t("g.delete")}
              </Button>
            )}
            <Button
              icon={existingPoll ? <UilSave /> : <UilPanelAdd />}
              disabled={hasEmptyOrDuplicatedChoices || !title || typeof accountAge !== "number"}
              iconPlacement="left"
              onClick={() => {
                if (title && endDate && choices && typeof accountAge === "number")
                  onAdd({
                    title,
                    endTime: endDate,
                    choices,
                    filters: {
                      accountAge
                    }
                  });
                setShow(false);
              }}
            >
              {existingPoll ? _t("polls.update") : _t("polls.attach")}
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}
